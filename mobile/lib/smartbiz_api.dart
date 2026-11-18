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
  String? _refreshToken;
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
    _refreshToken = data['refresh_token'] as String?;
    if (register && _token == null) return data;
    final memberships = (data['memberships'] as List<dynamic>? ?? const []);
    if (memberships.isEmpty) {
      businessId = null;
      return data;
    }
    businessId =
        (memberships.first as Map<String, dynamic>)['business']['id'] as int;
    return data;
  }

  Future<void> signOut() async {
    try {
      if (isSignedIn) {
        await _request(
          'POST',
          '/api/v1/auth/logout',
          body: {'refresh_token': _refreshToken},
        );
      }
    } catch (_) {
      // Clear the local session even when the API is offline or the token expired.
    } finally {
      _token = null;
      _refreshToken = null;
      businessId = null;
    }
  }

  Future<Map<String, dynamic>> summary({
    String? fromDate,
    String? toDate,
    int? customerId,
    int? productId,
  }) async => _asMap(
    await request(
      'GET',
      '/api/v1/dashboard/summary',
      query: _filters(fromDate, toDate, customerId, productId),
    ),
  );

  Future<List<Map<String, dynamic>>> sales({
    String? fromDate,
    String? toDate,
    int? customerId,
    int? productId,
  }) async => _asList(
    await request(
      'GET',
      '/api/v1/sales',
      query: _filters(fromDate, toDate, customerId, productId),
    ),
  );

  Future<List<Map<String, dynamic>>> salesTrend({
    String? fromDate,
    String? toDate,
    String interval = 'day',
    int? customerId,
    int? productId,
  }) async {
    final query = _filters(fromDate, toDate, customerId, productId)
      ..['interval'] = interval;
    final response = _asMap(
      await request('GET', '/api/v1/analytics/sales-trend', query: query),
    );
    return _asList(response['buckets']);
  }

  Future<List<Map<String, dynamic>>> topProducts({
    String? fromDate,
    String? toDate,
    int? customerId,
    int? productId,
  }) async {
    final data = _asMap(
      await request(
        'GET',
        '/api/v1/analytics/top-products',
        query: _filters(fromDate, toDate, customerId, productId)
          ..['limit'] = '100',
      ),
    );
    return _asList(data['products']);
  }

  Future<List<Map<String, dynamic>>> products() async =>
      _asList(_decode(await _request('GET', '/api/v1/products')));

  Future<List<Map<String, dynamic>>> customers() async =>
      _asList(_decode(await _request('GET', '/api/v1/customers')));

  Future<void> createProduct({
    required String name,
    required String sku,
    required int priceMinor,
    required int stock,
    int? costPriceMinor,
  }) async {
    await request(
      'POST',
      '/api/v1/products',
      body: {
        'name': name.trim(),
        'sku': sku.trim(),
        'price_minor': priceMinor,
        'stock_quantity': stock,
        'cost_price_minor': costPriceMinor,
      },
    );
  }

  Future<void> updateProduct(int id, Map<String, dynamic> values) async =>
      request('PATCH', '/api/v1/products/$id', body: values);
  Future<void> deleteProduct(int id) async =>
      request('DELETE', '/api/v1/products/$id');

  Future<void> createCustomer({
    required String name,
    String? email,
    String? phone,
  }) async {
    await request(
      'POST',
      '/api/v1/customers',
      body: {
        'name': name.trim(),
        'email': email?.trim().isEmpty == true ? null : email?.trim(),
        'phone': phone?.trim().isEmpty == true ? null : phone?.trim(),
      },
    );
  }

  Future<void> updateCustomer(int id, Map<String, dynamic> values) async =>
      request('PATCH', '/api/v1/customers/$id', body: values);
  Future<void> deleteCustomer(int id) async =>
      request('DELETE', '/api/v1/customers/$id');
  Future<Map<String, dynamic>> customerStats(int id) async =>
      _asMap(await request('GET', '/api/v1/customers/$id/stats'));

  Future<void> recordSale(Map<int, int> quantities, {int? customerId}) async {
    final items = quantities.entries
        .where((entry) => entry.value > 0)
        .map((entry) => {'product_id': entry.key, 'quantity': entry.value})
        .toList();
    if (items.isEmpty)
      throw const SmartBizException('Add at least one item to the sale.');
    await _request(
      'POST',
      '/api/v1/sales',
      body: {'items': items, if (customerId != null) 'customer_id': customerId},
    );
  }

  Future<void> correctSale(
    int id,
    List<Map<String, dynamic>> items, {
    int? customerId,
  }) async => request(
    'PATCH',
    '/api/v1/sales/$id',
    body: {'customer_id': customerId, 'items': items},
  );
  Future<void> deleteSale(int id) async =>
      request('DELETE', '/api/v1/sales/$id');

  Future<List<Map<String, dynamic>>> businesses() async =>
      _asList(await request('GET', '/api/v1/businesses'));
  Future<Map<String, dynamic>> currentAccount() async =>
      _asMap(await request('GET', '/api/v1/auth/me'));
  Future<Map<String, dynamic>> createBusiness(
    String name, {
    String currency = 'INR',
    String timezone = 'Asia/Kolkata',
  }) async => _asMap(
    await request(
      'POST',
      '/api/v1/businesses',
      body: {'name': name, 'currency': currency, 'timezone': timezone},
    ),
  );
  Future<List<Map<String, dynamic>>> members() async =>
      _asList(await request('GET', '/api/v1/businesses/members'));
  Future<List<Map<String, dynamic>>> invitations() async =>
      _asList(await request('GET', '/api/v1/businesses/invitations'));
  Future<Map<String, dynamic>> invite(String email, String role) async =>
      _asMap(
        await request(
          'POST',
          '/api/v1/businesses/invitations',
          body: {'email': email, 'role': role},
        ),
      );
  Future<void> revokeInvitation(int id) async =>
      request('DELETE', '/api/v1/businesses/invitations/$id');
  Future<void> removeMember(int id) async =>
      request('DELETE', '/api/v1/businesses/members/$id');
  Future<void> updateProfile(String name) async =>
      request('PATCH', '/api/v1/auth/profile', body: {'full_name': name});
  Future<Map<String, dynamic>> changeEmail(
    String email,
    String password,
  ) async => _asMap(
    await request(
      'POST',
      '/api/v1/auth/email-change',
      body: {'email': email, 'current_password': password},
    ),
  );
  Future<void> changePassword(String current, String next) async => request(
    'POST',
    '/api/v1/auth/password',
    body: {'current_password': current, 'new_password': next},
  );

  Future<Map<String, dynamic>> acceptInvitation(String token) async {
    if (_token == null)
      throw const SmartBizException('Sign in to accept this invitation.');
    final response = await _client.post(
      Uri.parse('$baseUrl/api/v1/auth/invitations/accept'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_token',
      },
      body: jsonEncode({'token': token}),
    );
    final membership = _asMap(_decode(response));
    businessId = (membership['business']['id'] as num).toInt();
    return membership;
  }

  Future<void> verifyEmail(String token) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/v1/auth/verify-email'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'token': token}),
    );
    _decode(response);
  }

  Future<void> importRows(String kind, List<Map<String, dynamic>> rows) async =>
      request('POST', '/api/v1/$kind/import', body: {'rows': rows});
  Future<String> exportSales({
    String? fromDate,
    String? toDate,
  }) async => (await _request(
    'GET',
    '/api/v1/reports/sales.csv?${_filters(fromDate, toDate).entries.map((e) => '${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value)}').join('&')}',
  )).body;

  Map<String, String> _filters(
    String? fromDate,
    String? toDate, [
    int? customerId,
    int? productId,
  ]) => {
    if (fromDate != null) 'from_date': fromDate,
    if (toDate != null) 'to_date': toDate,
    if (customerId != null) 'customer_id': '$customerId',
    if (productId != null) 'product_id': '$productId',
  };

  Future<dynamic> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
  }) async {
    final uri = Uri.parse('$baseUrl$path')
        .replace(queryParameters: query?.isEmpty == true ? null : query);
    return _decode(
      await _request(
        method,
        uri.toString().replaceFirst(baseUrl, ''),
        body: body,
      ),
    );
  }

  Future<http.Response> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    if (!isSignedIn)
      throw const SmartBizException('Please sign in to continue.');
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $_token',
      'X-Business-Id': '$businessId',
    };
    final uri = Uri.parse('$baseUrl$path');
    Future<http.Response> send() async {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      final streamed = await _client.send(request);
      return http.Response.fromStream(streamed);
    }

    var response = await send();
    if (response.statusCode == 401 &&
        _refreshToken != null &&
        path != '/api/v1/auth/refresh') {
      final refreshResponse = await _client.post(
        Uri.parse('$baseUrl/api/v1/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh_token': _refreshToken}),
      );
      if (refreshResponse.statusCode >= 200 &&
          refreshResponse.statusCode < 300) {
        final fresh = _asMap(_decode(refreshResponse));
        _token = fresh['access_token'] as String?;
        _refreshToken = fresh['refresh_token'] as String?;
        headers['Authorization'] = 'Bearer $_token';
        if (path == '/api/v1/auth/logout') {
          body = {'refresh_token': _refreshToken};
        }
        response = await send();
      }
    }
    return response;
  }

  dynamic _decode(http.Response response) {
    dynamic data;
    try {
      data = jsonDecode(response.body);
    } on FormatException {
      data = null;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final rawDetail = data is Map<String, dynamic> ? data['detail'] : null;
      String? detail;
      if (rawDetail is Map<String, dynamic>) {
        detail = rawDetail['message'] as String?;
        final rows = rawDetail['rows'];
        if (rows is List) {
          final issues = rows
              .whereType<Map<String, dynamic>>()
              .map(
                (row) =>
                    'Row ${row['row'] ?? '?'}: ${row['message'] ?? row['field'] ?? 'Invalid value'}',
              )
              .join('\n');
          if (issues.isNotEmpty)
            detail = '${detail ?? 'Import validation failed.'}\n$issues';
        }
      } else if (rawDetail is String) {
        detail = rawDetail;
      }
      if (response.statusCode == 401) {
        _token = null;
        _refreshToken = null;
        businessId = null;
      }
      throw SmartBizException(
        detail ?? 'Request failed (${response.statusCode}).',
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
