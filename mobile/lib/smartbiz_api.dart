import 'dart:convert';

import 'package:http/http.dart' as http;

const _configuredBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8000',
);

class SmartBizApi {
  SmartBizApi({String? baseUrl, http.Client? client})
    : baseUrl = (baseUrl ?? _configuredBaseUrl).replaceFirst(RegExp(r'/$'), ''),
      _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;
  String? _token;
  int? businessId;

  bool get isSignedIn => _token != null && businessId != null;

  Future<Map<String, dynamic>> signIn({
    required String email,
    required String password,
    required bool register,
    String? fullName,
    String? businessName,
  }) async {
    final payload = <String, dynamic>{
      'email': email.trim(),
      'password': password,
    };
    if (register) {
      payload['full_name'] = fullName?.trim();
      payload['business_name'] = businessName?.trim();
    }
    final response = await _client.post(
      Uri.parse('$baseUrl/api/v1/auth/${register ? 'register' : 'login'}'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    final data = _decode(response);
    _token = data['access_token'] as String?;
    final memberships = (data['memberships'] as List<dynamic>? ?? const []);
    if (memberships.isEmpty) {
      _token = null;
      throw const SmartBizException(
        'This account is not connected to a business yet. Ask an owner for an invitation.',
      );
    }
    businessId =
        (memberships.first as Map<String, dynamic>)['business']['id'] as int;
    return data;
  }

  Future<void> signOut() async {
    try {
      if (isSignedIn) await _request('POST', '/api/v1/auth/logout');
    } catch (_) {
      // Clear the local session even when the API is offline or the token expired.
    } finally {
      _token = null;
      businessId = null;
    }
  }

  Future<Map<String, dynamic>> summary() async =>
      _asMap(_decode(await _request('GET', '/api/v1/dashboard/summary')));

  Future<List<Map<String, dynamic>>> sales() async =>
      _asList(_decode(await _request('GET', '/api/v1/sales')));

  Future<List<Map<String, dynamic>>> salesTrend() async {
    final response = _decode(
      await _request('GET', '/api/v1/analytics/sales-trend'),
    );
    return _asList((response as Map<String, dynamic>)['buckets']);
  }

  Future<List<Map<String, dynamic>>> products() async =>
      _asList(_decode(await _request('GET', '/api/v1/products')));

  Future<void> recordSale(Map<int, int> quantities) async {
    final items = quantities.entries
        .where((entry) => entry.value > 0)
        .map((entry) => {'product_id': entry.key, 'quantity': entry.value})
        .toList();
    if (items.isEmpty)
      throw const SmartBizException('Add at least one item to the sale.');
    await _request('POST', '/api/v1/sales', body: {'items': items});
  }

  Future<http.Response> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) {
    if (!isSignedIn)
      throw const SmartBizException('Please sign in to continue.');
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $_token',
      'X-Business-Id': '$businessId',
    };
    final uri = Uri.parse('$baseUrl$path');
    return switch (method) {
      'POST' => _client.post(
        uri,
        headers: headers,
        body: jsonEncode(body ?? {}),
      ),
      _ => _client.get(uri, headers: headers),
    };
  }

  dynamic _decode(http.Response response) {
    dynamic data;
    try {
      data = jsonDecode(response.body);
    } on FormatException {
      data = null;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final detail = data is Map<String, dynamic> ? data['detail'] : null;
      if (response.statusCode == 401) {
        _token = null;
        businessId = null;
      }
      throw SmartBizException(
        detail is String ? detail : 'Request failed (${response.statusCode}).',
      );
    }
    return data;
  }

  Map<String, dynamic> _asMap(dynamic value) => value as Map<String, dynamic>;
  List<Map<String, dynamic>> _asList(dynamic value) =>
      (value as List<dynamic>).cast<Map<String, dynamic>>();
}

class SmartBizException implements Exception {
  const SmartBizException(this.message);
  final String message;

  @override
  String toString() => message;
}
