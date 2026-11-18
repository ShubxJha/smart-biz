import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'smartbiz_api.dart';

// Brand Accent Colors
const _green = Color(0xFF059669);
const _greenDark = Color(0xFF10B981);
const _inkLight = Color(0xFF0F172A);
const _inkDark = Color(0xFFF4F4F5);
const _mutedLight = Color(0xFF64748B);
const _mutedDark = Color(0xFF94A3B8);
const _fileChannel = MethodChannel('com.smartbiz.mobile/files');

// Theme State Controller
final themeModeNotifier = ValueNotifier<ThemeMode>(ThemeMode.system);

void main() => runApp(const SmartBizApp());

class SmartBizApp extends StatelessWidget {
  const SmartBizApp({super.key});

  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    colorScheme: const ColorScheme.light(
      primary: _green,
      onPrimary: Colors.white,
      secondary: _green,
      surface: Colors.white,
      onSurface: _inkLight,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: _inkLight,
        fontSize: 18,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
      ),
      iconTheme: IconThemeData(color: _inkLight),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _green, width: 1.8),
      ),
      labelStyle: const TextStyle(color: _mutedLight, fontSize: 13.5),
      prefixIconColor: _mutedLight,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: const Color(0xFFECFDF5),
      elevation: 0,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 12,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w700
              : FontWeight.w500,
          color: states.contains(WidgetState.selected) ? _green : _mutedLight,
        ),
      ),
    ),
  );

  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: const Color(0xFF09090B),
    colorScheme: const ColorScheme.dark(
      primary: _greenDark,
      onPrimary: Color(0xFF09090B),
      secondary: _greenDark,
      surface: Color(0xFF18181B),
      onSurface: _inkDark,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF121215),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: _inkDark,
        fontSize: 18,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
      ),
      iconTheme: IconThemeData(color: _inkDark),
    ),
    cardTheme: CardThemeData(
      color: const Color(0xFF18181B),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFF27272A)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF18181B),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF27272A)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF27272A)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _greenDark, width: 1.8),
      ),
      labelStyle: const TextStyle(color: _mutedDark, fontSize: 13.5),
      prefixIconColor: _mutedDark,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xFF121215),
      indicatorColor: const Color(0x2810B981),
      elevation: 0,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 12,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w700
              : FontWeight.w500,
          color: states.contains(WidgetState.selected)
              ? _greenDark
              : _mutedDark,
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeModeNotifier,
      builder: (context, themeMode, _) => MaterialApp(
        title: 'SmartBiz',
        debugShowCheckedModeBanner: false,
        theme: lightTheme,
        darkTheme: darkTheme,
        themeMode: themeMode,
        home: const SignInPage(),
      ),
    );
  }
}

String _money(dynamic minor, String currency) {
  final value = (minor as num? ?? 0).toInt() / 100;
  final amount = value.toStringAsFixed(2);
  final symbol = currency == 'INR'
      ? '₹'
      : currency == 'USD'
      ? '\$'
      : '$currency ';
  return '$symbol$amount';
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  return parts
      .take(2)
      .map((part) => part.isEmpty ? '' : part[0])
      .join()
      .toUpperCase();
}

String _dateOnly(DateTime value) =>
    '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';
String _escapeHtml(String value) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

String? _extractToken(String raw, String key) {
  final uri = Uri.tryParse(raw.trim());
  final direct = uri?.queryParameters[key];
  if (direct != null && direct.isNotEmpty) return direct;
  final fragment = uri?.fragment ?? '';
  return Uri.splitQueryString(fragment).cast<String, String?>()[key];
}

String _localDate(String? value) {
  final parsed = DateTime.tryParse(value ?? '')?.toLocal();
  return parsed == null
      ? 'Date unavailable'
      : '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')} ${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
}

List<List<String>> _parseCsv(String source) {
  final rows = <List<String>>[];
  final row = <String>[];
  final cell = StringBuffer();
  var quoted = false;
  for (var i = 0; i < source.length; i++) {
    final char = source[i];
    if (char == '"') {
      if (quoted && i + 1 < source.length && source[i + 1] == '"') {
        cell.write('"');
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char == ',') {
      row.add(cell.toString());
      cell.clear();
    } else if (!quoted && (char == '\n' || char == '\r')) {
      if (char == '\r' && i + 1 < source.length && source[i + 1] == '\n') i++;
      row.add(cell.toString());
      cell.clear();
      rows.add(List<String>.from(row));
      row.clear();
    } else {
      cell.write(char);
    }
  }
  if (quoted)
    throw const FormatException('CSV contains an unclosed quoted value.');
  if (cell.isNotEmpty || row.isNotEmpty) {
    row.add(cell.toString());
    rows.add(row);
  }
  return rows;
}

String _canonicalCsvHeader(String kind, String header) {
  final key = header.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
  if (kind == 'products') {
    if (['name', 'product', 'productname', 'item', 'itemname'].contains(key))
      return 'name';
    if ([
      'sku',
      'productsku',
      'productcode',
      'itemcode',
      'barcode',
    ].contains(key))
      return 'sku';
    if (['price', 'sellingprice', 'unitprice', 'saleprice'].contains(key))
      return 'price';
    if (['priceminor', 'unitpriceminor'].contains(key)) return 'price_minor';
    if (['cost', 'costprice', 'unitcost'].contains(key)) return 'cost_price';
    if (key == 'costpriceminor') return 'cost_price_minor';
    if (['stock', 'quantity', 'stockquantity', 'openingstock'].contains(key))
      return 'stock_quantity';
  }
  if (kind == 'customers') {
    if (['name', 'customer', 'customername', 'fullname'].contains(key))
      return 'name';
    if (['email', 'emailaddress', 'customeremail'].contains(key))
      return 'email';
    if ([
      'phone',
      'phonenumber',
      'mobile',
      'mobilenumber',
      'customerphone',
    ].contains(key))
      return 'phone';
  }
  if (kind == 'sales') {
    if ([
      'saleref',
      'orderid',
      'orderno',
      'ordernumber',
      'invoiceno',
      'invoicenumber',
      'billno',
      'billnumber',
      'receiptnumber',
      'transactionid',
      'reference',
      'id',
    ].contains(key))
      return 'sale_ref';
    if ([
      'soldat',
      'date',
      'datetime',
      'saledate',
      'orderdate',
      'timestamp',
    ].contains(key))
      return 'sold_at';
    if (['customer', 'customername', 'buyer', 'buyername'].contains(key))
      return 'customer_name';
    if ([
      'sku',
      'productsku',
      'productcode',
      'itemcode',
      'barcode',
    ].contains(key))
      return 'sku';
    if (['quantity', 'qty', 'units'].contains(key)) return 'quantity';
    if (['unitprice', 'price', 'sellingprice'].contains(key))
      return 'unit_price';
    if (['unitpriceminor', 'priceminor'].contains(key))
      return 'unit_price_minor';
  }
  return header.toLowerCase().trim();
}

class SignInPage extends StatefulWidget {
  const SignInPage({super.key});

  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final _formKey = GlobalKey<FormState>();
  final _api = SmartBizApi();
  final _name = TextEditingController();
  final _business = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _register = false;
  bool _loading = false;
  String? _error;
  String? _notice;

  @override
  void dispose() {
    _name.dispose();
    _business.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
      _notice = null;
    });
    try {
      final data = await _api.signIn(
        email: _email.text,
        password: _password.text,
        register: _register,
        fullName: _name.text,
        businessName: _business.text,
      );
      if (!mounted) return;
      if (_register && data['user'] == null) {
        final url = data['verification_url'] as String?;
        setState(() {
          _notice = url == null
              ? 'Account created. Check your email to verify the address, then sign in.'
              : 'Account created. Verify your email using this link: $url';
        });
        return;
      }
      final user = data['user'] as Map<String, dynamic>;
      final memberships = data['memberships'] as List<dynamic>;
      if (memberships.isEmpty) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => _InviteAcceptancePage(api: _api, user: user),
          ),
        );
        return;
      }
      final membership = memberships.first as Map<String, dynamic>;
      final business = Map<String, dynamic>.from(
        membership['business'] as Map<String, dynamic>,
      )..['role'] = membership['role'];
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) =>
              SmartBizHome(api: _api, user: user, business: business),
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyRegistrationLink() async {
    final token = _extractToken(_notice ?? '', 'verify');
    if (token == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _api.verifyEmail(token);
      if (mounted)
        setState(() {
          _notice = 'Email verified. You can now sign in.';
          _register = false;
        });
    } catch (e) {
      if (mounted) setState(() => _error = _friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? _greenDark : _green;
    final inkColor = isDark ? _inkDark : _inkLight;
    final mutedColor = isDark ? _mutedDark : _mutedLight;

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            // Theme toggle button in corner
            Positioned(
              top: 12,
              right: 16,
              child: IconButton(
                tooltip: 'Toggle Theme',
                icon: Icon(
                  isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                ),
                onPressed: () {
                  themeModeNotifier.value = isDark
                      ? ThemeMode.light
                      : ThemeMode.dark;
                },
              ),
            ),
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(26),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 16),
                      // Brand Mark
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: primaryColor,
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: primaryColor.withValues(alpha: 0.25),
                                  blurRadius: 10,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.grid_view_rounded,
                              color: Colors.white,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'smart',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 25,
                              color: inkColor,
                              letterSpacing: -1,
                            ),
                          ),
                          Text(
                            'biz',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 25,
                              color: primaryColor,
                              letterSpacing: -1,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 38),
                      Text(
                        _register ? 'Launch your workspace' : 'Welcome back',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 28,
                          color: inkColor,
                          letterSpacing: -0.6,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _register
                            ? 'Create your business account to start capturing sales.'
                            : 'Sign in to access your sales, catalog, and analytics.',
                        style: TextStyle(
                          color: mutedColor,
                          fontSize: 14,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 28),
                      Form(
                        key: _formKey,
                        child: Column(
                          children: [
                            if (_register) ...[
                              TextFormField(
                                controller: _name,
                                textCapitalization: TextCapitalization.words,
                                decoration: const InputDecoration(
                                  labelText: 'Full name',
                                  prefixIcon: Icon(Icons.person_outline),
                                ),
                                validator: (value) =>
                                    value == null || value.trim().isEmpty
                                    ? 'Enter your name'
                                    : null,
                              ),
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: _business,
                                textCapitalization: TextCapitalization.words,
                                decoration: const InputDecoration(
                                  labelText: 'Business name',
                                  prefixIcon: Icon(Icons.storefront_outlined),
                                ),
                                validator: (value) =>
                                    value == null || value.trim().isEmpty
                                    ? 'Enter a business name'
                                    : null,
                              ),
                              const SizedBox(height: 14),
                            ],
                            TextFormField(
                              controller: _email,
                              keyboardType: TextInputType.emailAddress,
                              autocorrect: false,
                              decoration: const InputDecoration(
                                labelText: 'Email address',
                                prefixIcon: Icon(Icons.alternate_email),
                              ),
                              validator: (value) =>
                                  value == null || !value.contains('@')
                                  ? 'Enter a valid email address'
                                  : null,
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _password,
                              obscureText: true,
                              decoration: const InputDecoration(
                                labelText: 'Password',
                                prefixIcon: Icon(Icons.lock_outline),
                              ),
                              validator: (value) =>
                                  value == null ||
                                      value.length < (_register ? 8 : 1)
                                  ? (_register
                                        ? 'Use at least 8 characters'
                                        : 'Enter your password')
                                  : null,
                            ),
                          ],
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        _ErrorBanner(message: _error!),
                      ],
                      if (_notice != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _notice!,
                                style: const TextStyle(
                                  color: Color(0xFF047857),
                                  fontSize: 13,
                                ),
                              ),
                              if (_notice!.contains('http'))
                                Wrap(
                                  children: [
                                    TextButton.icon(
                                      onPressed: () => Clipboard.setData(
                                        ClipboardData(text: _notice!),
                                      ),
                                      icon: const Icon(Icons.copy),
                                      label: const Text('Copy link'),
                                    ),
                                    TextButton(
                                      onPressed: _verifyRegistrationLink,
                                      child: const Text('Verify in app'),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 22),
                      FilledButton(
                        onPressed: _loading ? null : _submit,
                        style: FilledButton.styleFrom(
                          backgroundColor: primaryColor,
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 1,
                        ),
                        child: _loading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                _register ? 'Create account' : 'Sign in',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                      ),
                      const SizedBox(height: 18),
                      TextButton(
                        onPressed: _loading
                            ? null
                            : () => setState(() {
                                _register = !_register;
                                _error = null;
                              }),
                        child: Text(
                          _register
                              ? 'Already have an account? Sign in'
                              : 'New to SmartBiz? Create an account',
                          style: TextStyle(
                            color: primaryColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.shield_outlined,
                            size: 15,
                            color: mutedColor,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Encrypted session token stored locally',
                            style: TextStyle(color: mutedColor, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InviteAcceptancePage extends StatefulWidget {
  const _InviteAcceptancePage({required this.api, required this.user});
  final SmartBizApi api;
  final Map<String, dynamic> user;
  @override
  State<_InviteAcceptancePage> createState() => _InviteAcceptancePageState();
}

class _InviteAcceptancePageState extends State<_InviteAcceptancePage> {
  final token = TextEditingController();
  bool loading = false;
  String? error;
  @override
  void dispose() {
    token.dispose();
    super.dispose();
  }

  Future<void> accept() async {
    final value = _extractToken(token.text, 'token') ?? token.text.trim();
    if (value.isEmpty) {
      setState(() => error = 'Paste your invitation link or token.');
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final membership = await widget.api.acceptInvitation(value);
      final business = Map<String, dynamic>.from(
        membership['business'] as Map<String, dynamic>,
      )..['role'] = membership['role'];
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => SmartBizHome(
            api: widget.api,
            user: widget.user,
            business: business,
          ),
        ),
      );
    } catch (e) {
      if (mounted) setState(() => error = _friendlyError(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.group_add_outlined, size: 48),
                const SizedBox(height: 16),
                Text(
                  'Accept your invitation',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Paste the invitation link from your email or the invitation token.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: token,
                  minLines: 1,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Invitation link or token',
                  ),
                ),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: _ErrorBanner(message: error!),
                  ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: loading ? null : accept,
                  child: loading
                      ? const CircularProgressIndicator()
                      : const Text('Join business'),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class SmartBizHome extends StatefulWidget {
  const SmartBizHome({
    super.key,
    required this.api,
    required this.user,
    required this.business,
  });
  final SmartBizApi api;
  final Map<String, dynamic> user;
  final Map<String, dynamic> business;

  @override
  State<SmartBizHome> createState() => _SmartBizHomeState();
}

class _SmartBizHomeState extends State<SmartBizHome> {
  int _tab = 0;
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _sales = [];
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _customers = [];
  List<Map<String, dynamic>> _trend = [];
  List<Map<String, dynamic>> _topProducts = [];
  String _interval = 'day';
  DateTimeRange? _dateRange;
  int? _customerFilter;
  int? _productFilter;

  String get _currency => widget.business['currency'] as String? ?? 'INR';
  String get _role => widget.business['role'] as String? ?? 'viewer';
  bool get _canManage => _role == 'owner' || _role == 'admin';
  bool get _canSell => _canManage || _role == 'sales';

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        widget.api.summary(
          fromDate: _dateRange == null ? null : _day(_dateRange!.start),
          toDate: _dateRange == null ? null : _day(_dateRange!.end),
          customerId: _customerFilter,
          productId: _productFilter,
        ),
        widget.api.sales(
          fromDate: _dateRange == null ? null : _day(_dateRange!.start),
          toDate: _dateRange == null ? null : _day(_dateRange!.end),
          customerId: _customerFilter,
          productId: _productFilter,
        ),
        widget.api.products(),
        widget.api.salesTrend(
          fromDate: _dateRange == null ? null : _day(_dateRange!.start),
          toDate: _dateRange == null ? null : _day(_dateRange!.end),
          interval: _interval,
          customerId: _customerFilter,
          productId: _productFilter,
        ),
        widget.api.customers(),
        widget.api.topProducts(
          fromDate: _dateRange == null ? null : _day(_dateRange!.start),
          toDate: _dateRange == null ? null : _day(_dateRange!.end),
          customerId: _customerFilter,
          productId: _productFilter,
        ),
      ]);
      if (!mounted) return;
      setState(() {
        _summary = results[0] as Map<String, dynamic>;
        _sales = results[1] as List<Map<String, dynamic>>;
        _products = results[2] as List<Map<String, dynamic>>;
        _trend = results[3] as List<Map<String, dynamic>>;
        _customers = results[4] as List<Map<String, dynamic>>;
        _topProducts = results[5] as List<Map<String, dynamic>>;
      });
    } catch (error) {
      if (mounted) setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _signOut() async {
    await widget.api.signOut();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const SignInPage()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? _greenDark : _green;
    final inkColor = isDark ? _inkDark : _inkLight;

    final pages = [
      _OverviewTab(
        summary: _summary,
        sales: _sales,
        trend: _trend,
        products: _products,
        currency: _currency,
        userName: widget.user['full_name'] as String? ?? 'there',
        businessName: widget.business['name'] as String? ?? 'your business',
        loading: _loading,
        onRetry: _refresh,
      ),
      _SalesTab(
        sales: _sales,
        currency: _currency,
        customers: _customers,
        products: _products,
        canManage: _canManage,
        onEdit: (s) => _editSale(context, s),
        onDelete: _deleteSale,
        onImport: () => _importCsv(context, 'sales'),
        onExport: () => _exportCsv(context),
        canSell: _canSell,
        onPrint: (s) => _printSale(s),
        dateRange: _dateRange,
        onDateRange: _chooseDateRange,
      ),
      _InventoryTab(
        products: _products,
        currency: _currency,
        loading: _loading,
        onRetry: _refresh,
        onAddProduct: () => _editProduct(context),
        onEdit: (p) => _editProduct(context, product: p),
        onDelete: _deleteProduct,
        onToggle: (p) => _toggleProduct(context, p),
        onImport: () => _importCsv(context, 'products'),
        canManage: _canManage,
      ),
      _CustomersTab(
        customers: _customers,
        onAdd: () => _editCustomer(context),
        onEdit: (c) => _editCustomer(context, customer: c),
        onDelete: _deleteCustomer,
        onOrders: (c) => _showCustomerStats(context, c),
        onImport: () => _importCsv(context, 'customers'),
        canManage: _canManage,
        canSell: _canSell,
      ),
      _AnalyticsTab(
        summary: _summary,
        trend: _trend,
        topProducts: _topProducts,
        currency: _currency,
        products: _products,
        customers: _customers,
        interval: _interval,
        onInterval: (value) {
          setState(() => _interval = value);
          _refresh();
        },
        dateRange: _dateRange,
        onDateRange: _chooseDateRange,
        customerId: _customerFilter,
        productId: _productFilter,
        onFilters: (customer, product) {
          setState(() {
            _customerFilter = customer;
            _productFilter = product;
          });
          _refresh();
        },
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.grid_view_rounded,
                color: primaryColor,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              widget.business['name'] as String? ?? 'SmartBiz',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: inkColor,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Toggle Theme',
            icon: Icon(
              isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
              size: 20,
            ),
            onPressed: () {
              themeModeNotifier.value = isDark
                  ? ThemeMode.light
                  : ThemeMode.dark;
            },
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _refresh,
            icon: const Icon(Icons.refresh_rounded, size: 21),
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout') _signOut();
              if (value == 'account') _accountSettings(context);
              if (value == 'team') _teamManagement(context);
              if (value == 'business') _switchBusiness(context);
              if (value == 'accept') _acceptInvitation(context);
              if (value == 'verify') _verifyAccountEmail(context);
              if (value == 'create_business') _createBusiness(context);
              if (value == 'export') _exportCsv(context);
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'account',
                child: Text('Account settings'),
              ),
              if (_canManage)
                const PopupMenuItem(
                  value: 'team',
                  child: Text('Team & invitations'),
                ),
              const PopupMenuItem(
                value: 'business',
                child: Text('Switch business'),
              ),
              const PopupMenuItem(
                value: 'accept',
                child: Text('Accept invitation'),
              ),
              const PopupMenuItem(
                value: 'verify',
                child: Text('Verify email link'),
              ),
              const PopupMenuItem(
                value: 'create_business',
                child: Text('Create business'),
              ),
              const PopupMenuItem(
                value: 'export',
                child: Text('Export sales CSV'),
              ),
              const PopupMenuDivider(),
              PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18, color: Colors.redAccent),
                    SizedBox(width: 10),
                    Text('Sign out', style: TextStyle(color: Colors.redAccent)),
                  ],
                ),
              ),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: CircleAvatar(
                radius: 16,
                backgroundColor: primaryColor.withValues(alpha: 0.15),
                child: Text(
                  _initials(widget.user['full_name'] as String? ?? 'SB'),
                  style: TextStyle(
                    fontSize: 12,
                    color: primaryColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (_error != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: _ErrorBanner(message: _error!, onRetry: _refresh),
              ),
            Expanded(
              child: IndexedStack(index: _tab, children: pages),
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (value) => setState(() => _tab = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.space_dashboard_outlined),
            selectedIcon: Icon(Icons.space_dashboard_rounded),
            label: 'Overview',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Sales',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2_rounded),
            label: 'Inventory',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'Customers',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights),
            label: 'Analytics',
          ),
        ],
      ),
      floatingActionButton: _canSell
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => Scaffold(
                    appBar: AppBar(title: const Text('New sale')),
                    body: SafeArea(
                      child: _NewSaleTab(
                        products: _products,
                        currency: _currency,
                        api: widget.api,
                        onSaved: _refresh,
                        customers: _customers,
                      ),
                    ),
                  ),
                ),
              ),
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('New sale'),
            )
          : null,
    );
  }

  String _day(DateTime day) =>
      '${day.year.toString().padLeft(4, '0')}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';

  Future<void> _chooseDateRange() async {
    final now = DateTime.now();
    final selected = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: now.add(const Duration(days: 1)),
      initialDateRange:
          _dateRange ??
          DateTimeRange(
            start: now.subtract(const Duration(days: 29)),
            end: now,
          ),
    );
    if (selected != null) {
      setState(() => _dateRange = selected);
      await _refresh();
    }
  }

  Future<void> _editCustomer(
    BuildContext context, {
    Map<String, dynamic>? customer,
  }) async {
    final name = TextEditingController(
          text: customer?['name'] as String? ?? '',
        ),
        email = TextEditingController(
          text: customer?['email'] as String? ?? '',
        ),
        phone = TextEditingController(
          text: customer?['phone'] as String? ?? '',
        );
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(customer == null ? 'Add customer' : 'Edit customer'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email (optional)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone (optional)',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (name.text.trim().isEmpty) return;
              try {
                if (customer == null) {
                  await widget.api.createCustomer(
                    name: name.text,
                    email: email.text,
                    phone: phone.text,
                  );
                } else {
                  await widget.api.updateCustomer(
                    (customer['id'] as num).toInt(),
                    {
                      'name': name.text.trim(),
                      'email': email.text.trim().isEmpty
                          ? null
                          : email.text.trim(),
                      'phone': phone.text.trim().isEmpty
                          ? null
                          : phone.text.trim(),
                    },
                  );
                }
                if (dialogContext.mounted) Navigator.pop(dialogContext, true);
              } catch (e) {
                if (dialogContext.mounted)
                  ScaffoldMessenger.of(dialogContext)
                      .showSnackBar(SnackBar(content: Text(_friendlyError(e))));
              }
            },
            child: Text(customer == null ? 'Add customer' : 'Save changes'),
          ),
        ],
      ),
    );
    name.dispose();
    email.dispose();
    phone.dispose();
    if (saved == true) _refresh();
  }

  Future<void> _editProduct(
    BuildContext context, {
    Map<String, dynamic>? product,
  }) async {
    final name = TextEditingController(text: product?['name'] as String? ?? ''),
        sku = TextEditingController(text: product?['sku'] as String? ?? ''),
        price = TextEditingController(
          text: product == null
              ? ''
              : ((product['price_minor'] as num).toDouble() / 100)
                    .toStringAsFixed(2),
        ),
        cost = TextEditingController(
          text: product?['cost_price_minor'] == null
              ? ''
              : ((product!['cost_price_minor'] as num).toDouble() / 100)
                    .toStringAsFixed(2),
        ),
        stock = TextEditingController(
          text: (product?['stock_quantity'] ?? 0).toString(),
        );
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(product == null ? 'Add product' : 'Edit product'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Product name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: sku,
                decoration: const InputDecoration(labelText: 'SKU'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: price,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(labelText: 'Price (${_currency})'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: cost,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(
                  labelText: 'Cost price (${_currency}, optional)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: stock,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Opening stock'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final amount = double.tryParse(price.text.trim());
              final costAmount = cost.text.trim().isEmpty
                  ? null
                  : double.tryParse(cost.text.trim());
              final quantity = int.tryParse(stock.text.trim());
              if (name.text.trim().isEmpty ||
                  sku.text.trim().isEmpty ||
                  amount == null ||
                  amount < 0 ||
                  (cost.text.trim().isNotEmpty &&
                      (costAmount == null || costAmount < 0)) ||
                  quantity == null ||
                  quantity < 0)
                return;
              try {
                if (product == null) {
                  await widget.api.createProduct(
                    name: name.text,
                    sku: sku.text,
                    priceMinor: (amount * 100).round(),
                    stock: quantity,
                    costPriceMinor: costAmount == null
                        ? null
                        : (costAmount * 100).round(),
                  );
                } else {
                  await widget.api.updateProduct(
                    (product['id'] as num).toInt(),
                    {
                      'name': name.text.trim(),
                      'sku': sku.text.trim(),
                      'price_minor': (amount * 100).round(),
                      'cost_price_minor': costAmount == null
                          ? null
                          : (costAmount * 100).round(),
                      'stock_quantity': quantity,
                    },
                  );
                }
                if (dialogContext.mounted) Navigator.pop(dialogContext, true);
              } catch (e) {
                if (dialogContext.mounted)
                  ScaffoldMessenger.of(dialogContext)
                      .showSnackBar(SnackBar(content: Text(_friendlyError(e))));
              }
            },
            child: Text(product == null ? 'Add product' : 'Save changes'),
          ),
        ],
      ),
    );
    name.dispose();
    sku.dispose();
    price.dispose();
    cost.dispose();
    stock.dispose();
    if (saved == true) _refresh();
  }

  Future<void> _deleteProduct(Map<String, dynamic> product) async {
    try {
      await widget.api.deleteProduct((product['id'] as num).toInt());
      await _refresh();
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _toggleProduct(
    BuildContext context,
    Map<String, dynamic> product,
  ) async {
    try {
      await widget.api.updateProduct((product['id'] as num).toInt(), {
        'active': !(product['active'] as bool? ?? true),
      });
      await _refresh();
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _deleteCustomer(Map<String, dynamic> customer) async {
    try {
      await widget.api.deleteCustomer((customer['id'] as num).toInt());
      await _refresh();
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _showCustomerStats(
    BuildContext context,
    Map<String, dynamic> customer,
  ) async {
    try {
      final stats = await widget.api.customerStats(
        (customer['id'] as num).toInt(),
      );
      if (!mounted) return;
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  customer['name'] as String,
                  style: Theme.of(ctx).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                Text(
                  'Lifetime spend: ${_money(stats['total_spend_minor'], _currency)}',
                ),
                Text('Orders: ${stats['order_count']}'),
                Text(
                  'Average order: ${_money(stats['average_order_minor'], _currency)}',
                ),
                const SizedBox(height: 12),
                const Text(
                  'Recent purchases',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                ...((stats['recent_sales'] as List<dynamic>? ?? const [])
                    .take(8)
                    .map(
                      (s) => _SaleRow(
                        sale: s as Map<String, dynamic>,
                        currency: _currency,
                      ),
                    )),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _deleteSale(Map<String, dynamic> sale) async {
    try {
      await widget.api.deleteSale((sale['id'] as num).toInt());
      await _refresh();
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _printSale(Map<String, dynamic> sale) async {
    Map<String, dynamic>? customer;
    for (final candidate in _customers) {
      if (candidate['id'] == sale['customer_id']) customer = candidate;
    }
    final items = (sale['items'] as List<dynamic>)
        .map(
          (item) =>
              '<tr><td>${_escapeHtml(item['product_name'] as String? ?? 'Item')}</td><td>${item['quantity']}</td><td>${_money(item['unit_price_minor'], _currency)}</td><td>${_money((item['unit_price_minor'] as num).toInt() * (item['quantity'] as num).toInt(), _currency)}</td></tr>',
        )
        .join();
    final html =
        '<html><head><meta name="viewport" content="width=device-width"><style>body{font:14px Arial,sans-serif;padding:24px;color:#111}h1{color:#059669;margin-bottom:2px}.muted{color:#64748b}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{text-align:left;padding:10px 4px;border-bottom:1px solid #ddd}th{color:#64748b}</style></head><body><h1>SmartBiz</h1><div>${_escapeHtml(widget.business['name'] as String? ?? 'Business')}</div><p class="muted">Sales receipt · #${sale['id']}<br>${_escapeHtml(_localDate(sale['created_at'] as String?))}<br>${_escapeHtml(customer?['name'] as String? ?? 'Walk-in customer')}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>$items</tbody></table><p class="total">Total ${_money(sale['total_minor'], _currency)}</p><p class="muted">Sales receipt only · Tax details are not recorded in SmartBiz</p></body></html>';
    try {
      await _fileChannel.invokeMethod<bool>('printReceipt', {'html': html});
    } on PlatformException catch (e) {
      _showMessage(e.message ?? 'Print is not available on this device.');
    } on MissingPluginException {
      _showMessage('Receipt printing is available in the Android app.');
    }
  }

  Future<void> _editSale(
    BuildContext context,
    Map<String, dynamic> sale,
  ) async {
    final quantities = <int, int>{};
    final priceInputs = <int, TextEditingController>{};
    for (final item in sale['items'] as List<dynamic>) {
      final id = item['product_id'];
      if (id is num) {
        quantities[id.toInt()] =
            (quantities[id.toInt()] ?? 0) + (item['quantity'] as num).toInt();
        priceInputs[id.toInt()] = TextEditingController(
          text: ((item['unit_price_minor'] as num).toDouble() / 100)
              .toStringAsFixed(2),
        );
      }
    }
    for (final p in _products) {
      final id = (p['id'] as num).toInt();
      priceInputs.putIfAbsent(
        id,
        () => TextEditingController(
          text: ((p['price_minor'] as num).toDouble() / 100).toStringAsFixed(2),
        ),
      );
    }
    int? customerId = sale['customer_id'] as int?;
    final saved = await showDialog<bool>(
      context: context,
      builder: (d) => StatefulBuilder(
        builder: (d, redraw) => AlertDialog(
          title: Text('Edit sale #${sale['id']}'),
          content: SizedBox(
            width: 420,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<int?>(
                    initialValue: customerId,
                    decoration: const InputDecoration(labelText: 'Customer'),
                    items: [
                      const DropdownMenuItem<int?>(
                        value: null,
                        child: Text('Walk-in customer'),
                      ),
                      ..._customers.map(
                        (c) => DropdownMenuItem<int?>(
                          value: (c['id'] as num).toInt(),
                          child: Text(c['name'] as String),
                        ),
                      ),
                    ],
                    onChanged: (v) => redraw(() => customerId = v),
                  ),
                  ..._products
                      .where(
                        (p) =>
                            p['active'] == true ||
                            quantities.containsKey((p['id'] as num).toInt()),
                      )
                      .map((p) {
                        final id = (p['id'] as num).toInt();
                        return Column(
                          children: [
                            Row(
                              children: [
                                Expanded(child: Text(p['name'] as String)),
                                IconButton(
                                  onPressed: () => redraw(
                                    () => quantities[id] =
                                        ((quantities[id] ?? 0) - 1).clamp(
                                          0,
                                          999999,
                                        ),
                                  ),
                                  icon: const Icon(Icons.remove),
                                ),
                                Text('${quantities[id] ?? 0}'),
                                IconButton(
                                  onPressed: () => redraw(
                                    () => quantities[id] =
                                        (quantities[id] ?? 0) + 1,
                                  ),
                                  icon: const Icon(Icons.add),
                                ),
                              ],
                            ),
                            TextField(
                              controller: priceInputs[id],
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: InputDecoration(
                                labelText: 'Unit price (${_currency})',
                              ),
                            ),
                          ],
                        );
                      }),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(d, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final items = quantities.entries.where((e) => e.value > 0).map((
                  e,
                ) {
                  return {
                    'product_id': e.key,
                    'quantity': e.value,
                    'unit_price_minor':
                        ((double.tryParse(priceInputs[e.key]!.text) ?? 0) * 100)
                            .round(),
                  };
                }).toList();
                if (items.isEmpty) return;
                try {
                  await widget.api.correctSale(
                    (sale['id'] as num).toInt(),
                    items,
                    customerId: customerId,
                  );
                  if (d.mounted) Navigator.pop(d, true);
                } catch (e) {
                  if (d.mounted)
                    ScaffoldMessenger.of(
                      d,
                    ).showSnackBar(SnackBar(content: Text(_friendlyError(e))));
                }
              },
              child: const Text('Save sale'),
            ),
          ],
        ),
      ),
    );
    for (final controller in priceInputs.values) {
      controller.dispose();
    }
    if (saved == true) await _refresh();
  }

  Future<void> _importCsv(BuildContext context, String kind) async {
    final text = TextEditingController();
    final rows = await showDialog<List<Map<String, String>>>(
      context: context,
      builder: (d) => AlertDialog(
        title: Text('Import $kind CSV'),
        content: SizedBox(
          width: 520,
          child: TextField(
            controller: text,
            minLines: 8,
            maxLines: 14,
            decoration: const InputDecoration(
              hintText: 'Paste CSV including the header row',
              border: OutlineInputBorder(),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(d),
            child: const Text('Cancel'),
          ),
          TextButton.icon(
            onPressed: () async {
              try {
                final selected = await _fileChannel.invokeMethod<String>(
                  'pickCsv',
                );
                if (selected != null && d.mounted) text.text = selected;
              } catch (e) {
                if (d.mounted)
                  ScaffoldMessenger.of(d).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Choose a CSV file on Android or paste its contents: $e',
                      ),
                    ),
                  );
              }
            },
            icon: const Icon(Icons.folder_open),
            label: const Text('Choose file'),
          ),
          FilledButton(
            onPressed: () {
              try {
                final parsed = _parseCsv(text.text);
                if (parsed.length < 2)
                  throw const FormatException(
                    'Include a header and at least one data row.',
                  );
                final headers = parsed.first
                    .map(
                      (v) => _canonicalCsvHeader(
                        kind,
                        v.replaceFirst('\uFEFF', '').trim(),
                      ),
                    )
                    .toList();
                final result = parsed
                    .skip(1)
                    .where((r) => r.any((v) => v.trim().isNotEmpty))
                    .map(
                      (r) => Map.fromEntries(
                        List.generate(
                          headers.length,
                          (i) => MapEntry(
                            headers[i],
                            i < r.length ? r[i].trim() : '',
                          ),
                        ),
                      ),
                    )
                    .toList();
                Navigator.pop(d, result);
              } catch (e) {
                ScaffoldMessenger.of(d)
                    .showSnackBar(SnackBar(content: Text('$e')));
              }
            },
            child: const Text('Review import'),
          ),
        ],
      ),
    );
    text.dispose();
    if (rows == null || rows.isEmpty) return;
    var sourceRows = rows;
    final availableHeaders = rows.first.keys.toList();
    final requiredFields = switch (kind) {
      'products' => [
        'name',
        'sku',
        if (!availableHeaders.contains('price_minor')) 'price',
      ],
      'customers' => ['name'],
      _ => [
        'sale_ref',
        'sold_at',
        'sku',
        'quantity',
        if (!availableHeaders.contains('unit_price_minor')) 'unit_price',
      ],
    };
    final missingFields = requiredFields
        .where((field) => !availableHeaders.contains(field))
        .toList();
    if (missingFields.isNotEmpty) {
      final selections = <String, String>{
        for (final field in missingFields) field: availableHeaders.first,
      };
      final chosen = await showDialog<Map<String, String>>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (dialogContext, redraw) => AlertDialog(
            title: const Text('Map CSV columns'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: missingFields
                  .map(
                    (field) => DropdownButtonFormField<String>(
                      initialValue: selections[field],
                      decoration: InputDecoration(
                        labelText: 'Column for $field',
                      ),
                      items: availableHeaders
                          .map(
                            (header) => DropdownMenuItem(
                              value: header,
                              child: Text(
                                header,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value != null)
                          redraw(() => selections[field] = value);
                      },
                    ),
                  )
                  .toList(),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(dialogContext, selections),
                child: const Text('Continue'),
              ),
            ],
          ),
        ),
      );
      if (chosen == null) return;
      sourceRows = rows
          .map(
            (row) => {
              ...row,
              for (final entry in chosen.entries)
                entry.key: row[entry.value] ?? '',
            },
          )
          .toList();
    }
    try {
      final mapped = <Map<String, dynamic>>[];
      for (final row in sourceRows) {
        if (kind == 'customers')
          mapped.add({
            'name': row['name'] ?? '',
            'email': row['email']?.isEmpty == true ? null : row['email'],
            'phone': row['phone']?.isEmpty == true ? null : row['phone'],
          });
        if (kind == 'products')
          mapped.add({
            'name': row['name'] ?? '',
            'sku': row['sku'] ?? '',
            'price_minor': row.containsKey('price_minor')
                ? int.parse(row['price_minor']!)
                : (double.parse(row['price'] ?? '0') * 100).round(),
            'cost_price_minor': row['cost_price']?.isEmpty == true
                ? null
                : row.containsKey('cost_price_minor')
                ? int.parse(row['cost_price_minor']!)
                : row['cost_price'] == null
                ? null
                : (double.parse(row['cost_price']!) * 100).round(),
            'stock_quantity': int.tryParse(row['stock_quantity'] ?? '0') ?? 0,
          });
        if (kind == 'sales') {
          final date = DateTime.parse(row['sold_at'] ?? row['date'] ?? '')
              .toUtc();
          mapped.add({
            'sale_ref': row['sale_ref'] ?? row['reference'] ?? '',
            'sold_at': date.toIso8601String(),
            'customer_name': row['customer_name']?.isEmpty == true
                ? null
                : row['customer_name'],
            'sku': row['sku'] ?? '',
            'quantity': int.parse(row['quantity'] ?? '1'),
            'unit_price_minor': row.containsKey('unit_price_minor')
                ? int.parse(row['unit_price_minor']!)
                : (double.parse(row['unit_price'] ?? '0') * 100).round(),
          });
        }
      }
      if (mapped.length > 500)
        throw const FormatException('Import up to 500 rows at a time.');
      final accepted = await showDialog<bool>(
        context: context,
        builder: (d) => AlertDialog(
          title: Text('Import ${mapped.length} $kind rows?'),
          content: const Text(
            'The server validates every row before saving. A conflict prevents the entire import.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(d, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(d, true),
              child: const Text('Import'),
            ),
          ],
        ),
      );
      if (accepted == true) {
        await widget.api.importRows(kind, mapped);
        await _refresh();
        _showMessage('Imported ${mapped.length} rows.');
      }
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _exportCsv(BuildContext context) async {
    try {
      final csv = await widget.api.exportSales(
        fromDate: _dateRange == null ? null : _day(_dateRange!.start),
        toDate: _dateRange == null ? null : _day(_dateRange!.end),
      );
      if (!mounted) return;
      try {
        final saved = await _fileChannel.invokeMethod<bool>('saveCsv', {
          'name': 'smartbiz-sales.csv',
          'text': csv,
        });
        if (saved == true) {
          _showMessage('Sales CSV saved.');
          return;
        }
      } on PlatformException {
        // Browser preview and unsupported platforms can copy the export below.
      } on MissingPluginException {
        // Browser preview and unsupported platforms can copy the export below.
      }
      await showDialog<void>(
        context: context,
        builder: (d) => AlertDialog(
          title: const Text('Sales CSV export'),
          content: SizedBox(
            width: 600,
            child: SingleChildScrollView(child: SelectableText(csv)),
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: csv));
                if (d.mounted) Navigator.pop(d);
                _showMessage('CSV copied to clipboard.');
              },
              child: const Text('Copy CSV'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(d),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _accountSettings(BuildContext context) async {
    final name = TextEditingController(
          text: widget.user['full_name'] as String? ?? '',
        ),
        email = TextEditingController(
          text: widget.user['email'] as String? ?? '',
        ),
        current = TextEditingController(),
        next = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (d) => AlertDialog(
        title: const Text('Account settings'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Full name'),
              ),
              FilledButton.tonal(
                onPressed: () async {
                  try {
                    await widget.api.updateProfile(name.text.trim());
                    widget.user['full_name'] = name.text.trim();
                    if (d.mounted) {
                      Navigator.pop(d);
                      setState(() {});
                      _showMessage('Profile updated.');
                    }
                  } catch (e) {
                    _showMessage(_friendlyError(e));
                  }
                },
                child: const Text('Save name'),
              ),
              const Divider(),
              TextField(
                controller: email,
                decoration: const InputDecoration(labelText: 'New email'),
              ),
              TextField(
                controller: current,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Current password',
                ),
              ),
              FilledButton.tonal(
                onPressed: () async {
                  try {
                    final response = await widget.api.changeEmail(
                      email.text.trim(),
                      current.text,
                    );
                    _showMessage(
                      response['verification_url'] as String? ??
                          'Check the new email for a verification link.',
                    );
                  } catch (e) {
                    _showMessage(_friendlyError(e));
                  }
                },
                child: const Text('Request email change'),
              ),
              const Divider(),
              TextField(
                controller: current,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Current password',
                ),
              ),
              TextField(
                controller: next,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New password'),
              ),
              FilledButton.tonal(
                onPressed: () async {
                  try {
                    await widget.api.changePassword(current.text, next.text);
                    if (d.mounted) Navigator.pop(d);
                    _showMessage('Password updated.');
                  } catch (e) {
                    _showMessage(_friendlyError(e));
                  }
                },
                child: const Text('Change password'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(d),
            child: const Text('Close'),
          ),
        ],
      ),
    );
    name.dispose();
    email.dispose();
    current.dispose();
    next.dispose();
  }

  Future<void> _switchBusiness(BuildContext context) async {
    try {
      final choices = await widget.api.businesses();
      if (!mounted) return;
      final selected = await showDialog<Map<String, dynamic>>(
        context: context,
        builder: (d) => SimpleDialog(
          title: const Text('Choose a business'),
          children: choices
              .map(
                (m) => SimpleDialogOption(
                  onPressed: () => Navigator.pop(d, m),
                  child: ListTile(
                    title: Text(m['business']['name'] as String),
                    subtitle: Text(m['role'] as String),
                  ),
                ),
              )
              .toList(),
        ),
      );
      if (selected != null) {
        widget.api.businessId = (selected['business']['id'] as num).toInt();
        widget.business.addAll(selected['business'] as Map<String, dynamic>);
        widget.business['role'] = selected['role'];
        await _refresh();
        setState(() {});
      }
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _acceptInvitation(BuildContext context) async {
    final input = TextEditingController();
    final raw = await showDialog<String>(
      context: context,
      builder: (d) => AlertDialog(
        title: const Text('Accept invitation'),
        content: TextField(
          controller: input,
          decoration: const InputDecoration(
            labelText: 'Paste invitation link or token',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(d),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(d, input.text.trim()),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    input.dispose();
    if (raw == null) return;
    final token = _extractToken(raw, 'token') ?? raw;
    try {
      final membership = await widget.api.acceptInvitation(token);
      widget.business.addAll(membership['business'] as Map<String, dynamic>);
      widget.business['role'] = membership['role'];
      widget.api.businessId = (membership['business']['id'] as num).toInt();
      await _refresh();
      _showMessage('Joined ${widget.business['name']}.');
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _verifyAccountEmail(BuildContext context) async {
    final controller = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (d) => AlertDialog(
        title: const Text('Verify email'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Paste verification link or token',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(d),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(d, controller.text.trim()),
            child: const Text('Verify'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value == null) return;
    final token = _extractToken(value, 'verify') ?? value;
    try {
      await widget.api.verifyEmail(token);
      final account = await widget.api.currentAccount();
      widget.user.addAll(account['user'] as Map<String, dynamic>);
      setState(() {});
      _showMessage('Email verified.');
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _createBusiness(BuildContext context) async {
    final input = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (d) => AlertDialog(
        title: const Text('Create business'),
        content: TextField(
          controller: input,
          decoration: const InputDecoration(labelText: 'Business name'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(d),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(d, input.text.trim()),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    input.dispose();
    if (name == null || name.isEmpty) return;
    try {
      final business = await widget.api.createBusiness(name);
      widget.business.addAll(business);
      widget.business['role'] = 'owner';
      widget.api.businessId = (business['id'] as num).toInt();
      await _refresh();
      setState(() {});
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  Future<void> _teamManagement(BuildContext context) async {
    try {
      final members = await widget.api.members();
      final invites = await widget.api.invitations();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (d) => StatefulBuilder(
          builder: (d, redraw) => AlertDialog(
            title: const Text('Team & invitations'),
            content: SizedBox(
              width: 520,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Members',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    ...members.map(
                      (m) => ListTile(
                        title: Text(m['user']['full_name'] as String),
                        subtitle: Text('${m['user']['email']} · ${m['role']}'),
                        trailing: m['role'] == 'owner'
                            ? null
                            : IconButton(
                                icon: const Icon(Icons.person_remove_outlined),
                                onPressed: () async {
                                  try {
                                    await widget.api.removeMember(
                                      (m['user']['id'] as num).toInt(),
                                    );
                                    members.remove(m);
                                    redraw(() {});
                                  } catch (e) {
                                    _showMessage(_friendlyError(e));
                                  }
                                },
                              ),
                      ),
                    ),
                    const Divider(),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Pending invitations',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    ...invites.map(
                      (i) => ListTile(
                        title: Text(i['email'] as String),
                        subtitle: Text(i['role'] as String),
                        trailing: IconButton(
                          icon: const Icon(Icons.cancel_outlined),
                          onPressed: () async {
                            await widget.api.revokeInvitation(
                              (i['id'] as num).toInt(),
                            );
                            invites.remove(i);
                            redraw(() {});
                          },
                        ),
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: () async {
                        final email = TextEditingController();
                        String role = 'sales';
                        final response = await showDialog<Map<String, String>>(
                          context: d,
                          builder: (inside) => StatefulBuilder(
                            builder: (inside, setRole) => AlertDialog(
                              title: const Text('Invite member'),
                              content: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  TextField(
                                    controller: email,
                                    decoration: const InputDecoration(
                                      labelText: 'Email',
                                    ),
                                  ),
                                  DropdownButtonFormField<String>(
                                    initialValue: role,
                                    items: ['admin', 'sales', 'viewer']
                                        .map(
                                          (r) => DropdownMenuItem(
                                            value: r,
                                            child: Text(r),
                                          ),
                                        )
                                        .toList(),
                                    onChanged: (v) =>
                                        setRole(() => role = v ?? 'sales'),
                                  ),
                                ],
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(inside),
                                  child: const Text('Cancel'),
                                ),
                                FilledButton(
                                  onPressed: () => Navigator.pop(inside, {
                                    'email': email.text,
                                    'role': role,
                                  }),
                                  child: const Text('Invite'),
                                ),
                              ],
                            ),
                          ),
                        );
                        if (response != null) {
                          try {
                            final invitation = await widget.api.invite(
                              response['email']!,
                              response['role']!,
                            );
                            invites.insert(0, invitation);
                            redraw(() {});
                            if (invitation['invitation_url'] != null)
                              _showMessage(
                                'Invitation link: ${invitation['invitation_url']}',
                              );
                          } catch (e) {
                            _showMessage(_friendlyError(e));
                          }
                        }
                      },
                      icon: const Icon(Icons.person_add_alt_1),
                      label: const Text('Invite member'),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(d),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      _showMessage(_friendlyError(e));
    }
  }

  void _showMessage(String message) {
    if (mounted)
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
  }
}

class _OverviewTab extends StatelessWidget {
  const _OverviewTab({
    required this.summary,
    required this.sales,
    required this.trend,
    required this.products,
    required this.currency,
    required this.userName,
    required this.businessName,
    required this.loading,
    required this.onRetry,
  });
  final Map<String, dynamic> summary;
  final List<Map<String, dynamic>> sales;
  final List<Map<String, dynamic>> trend;
  final List<Map<String, dynamic>> products;
  final String currency;
  final String userName;
  final String businessName;
  final bool loading;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? _greenDark : _green;
    final inkColor = isDark ? _inkDark : _inkLight;
    final mutedColor = isDark ? _mutedDark : _mutedLight;

    return RefreshIndicator(
      onRefresh: () async => onRetry(),
      color: primaryColor,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
          Text(
            'EXECUTIVE OVERVIEW',
            style: TextStyle(
              color: primaryColor,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Welcome, ${userName.split(' ').first} ✦',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: inkColor,
              letterSpacing: -0.6,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Performance summary for $businessName.',
            style: TextStyle(color: mutedColor, fontSize: 13),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  title: 'Total Revenue',
                  value: _money(summary['revenue_minor'], currency),
                  icon: Icons.trending_up,
                  tone: _MetricTone.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricCard(
                  title: 'Total Orders',
                  value: '${summary['order_count'] ?? '—'}',
                  icon: Icons.shopping_bag_outlined,
                  tone: _MetricTone.blue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  title: 'Avg. Order Value',
                  value: _money(summary['average_order_value_minor'], currency),
                  icon: Icons.receipt_long_outlined,
                  tone: _MetricTone.amber,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricCard(
                  title: 'Catalog Stock',
                  value:
                      '${products.fold<int>(0, (sum, item) => sum + ((item['stock_quantity'] as num?)?.toInt() ?? 0))}',
                  icon: Icons.inventory_2_outlined,
                  tone: _MetricTone.purple,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _SectionCard(
            title: 'Revenue Trajectory',
            subtitle: 'Last 30 days performance',
            trailing: loading
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: primaryColor,
                    ),
                  )
                : null,
            child: SizedBox(
              height: 165,
              child: trend.isEmpty
                  ? const _EmptyMessage('Sales activity will appear here')
                  : CustomPaint(
                      painter: _TrendPainter(trend, isDark: isDark),
                      child: const SizedBox.expand(),
                    ),
            ),
          ),
          const SizedBox(height: 18),
          _SectionCard(
            title: 'Recent Transactions',
            subtitle: 'Latest orders recorded in workspace',
            child: sales.isEmpty
                ? const _EmptyMessage('No sales in the last 30 days')
                : Column(
                    children: sales
                        .take(5)
                        .map((sale) => _SaleRow(sale: sale, currency: currency))
                        .toList(),
                  ),
          ),
          if (loading && summary.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: CircularProgressIndicator(color: primaryColor),
              ),
            ),
        ],
      ),
    );
  }
}

class _InventoryTab extends StatefulWidget {
  const _InventoryTab({
    required this.products,
    required this.currency,
    required this.loading,
    required this.onRetry,
    required this.onAddProduct,
    required this.onEdit,
    required this.onDelete,
    required this.onToggle,
    required this.onImport,
    required this.canManage,
  });
  final List<Map<String, dynamic>> products;
  final String currency;
  final bool loading;
  final VoidCallback onRetry;
  final VoidCallback onAddProduct;
  final ValueChanged<Map<String, dynamic>> onEdit;
  final ValueChanged<Map<String, dynamic>> onDelete;
  final ValueChanged<Map<String, dynamic>> onToggle;
  final VoidCallback onImport;
  final bool canManage;

  @override
  State<_InventoryTab> createState() => _InventoryTabState();
}

class _InventoryTabState extends State<_InventoryTab> {
  String _search = '';
  String _filter = 'all'; // all, active, low_stock

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? _greenDark : _green;
    final inkColor = isDark ? _inkDark : _inkLight;
    final mutedColor = isDark ? _mutedDark : _mutedLight;

    final filtered = widget.products.where((p) {
      final name = (p['name'] as String? ?? '').toLowerCase();
      final sku = (p['sku'] as String? ?? '').toLowerCase();
      final q = _search.toLowerCase().trim();
      final matchesSearch = q.isEmpty || name.contains(q) || sku.contains(q);
      if (!matchesSearch) return false;

      final stock = (p['stock_quantity'] as num? ?? 0).toInt();
      final active = p['active'] as bool? ?? true;
      if (_filter == 'active') return active;
      if (_filter == 'inactive') return !active;
      if (_filter == 'low_stock') return stock <= 10;
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: () async => widget.onRetry(),
      color: primaryColor,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
          if (widget.canManage)
            Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                spacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: widget.onImport,
                    icon: const Icon(Icons.upload_file),
                    label: const Text('Import CSV'),
                  ),
                  FilledButton.icon(
                    onPressed: widget.onAddProduct,
                    icon: const Icon(Icons.add),
                    label: const Text('Add product'),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          Text(
            'CATALOG & STOCK',
            style: TextStyle(
              color: primaryColor,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Inventory Tracker',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: inkColor,
              letterSpacing: -0.6,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${widget.products.length} products available in this workspace',
            style: TextStyle(color: mutedColor, fontSize: 13),
          ),
          const SizedBox(height: 16),
          // Search Bar
          TextField(
            onChanged: (val) => setState(() => _search = val),
            decoration: InputDecoration(
              hintText: 'Search products or SKU...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _search.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () => setState(() => _search = ''),
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 10),
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip(
                  'All (${widget.products.length})',
                  'all',
                  primaryColor,
                ),
                const SizedBox(width: 8),
                _buildFilterChip('Active only', 'active', primaryColor),
                const SizedBox(width: 8),
                _buildFilterChip('Inactive', 'inactive', primaryColor),
                const SizedBox(width: 8),
                _buildFilterChip('Low stock (≤10)', 'low_stock', primaryColor),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (widget.loading && widget.products.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: CircularProgressIndicator(color: primaryColor),
              ),
            ),
          if (!widget.loading && filtered.isEmpty)
            const _EmptyMessage('No matching products found'),
          ...filtered.map((product) {
            final stock = (product['stock_quantity'] as num? ?? 0).toInt();
            final active = product['active'] as bool? ?? true;
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.inventory_2_outlined,
                        color: primaryColor,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product['name'] as String? ?? 'Product',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: inkColor,
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'SKU: ${product['sku'] ?? '—'}',
                            style: TextStyle(
                              color: mutedColor,
                              fontSize: 12,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          _money(product['price_minor'], widget.currency),
                          style: TextStyle(
                            color: inkColor,
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                          ),
                        ),
                        if (product['cost_price_minor'] != null) ...[
                          const SizedBox(height: 3),
                          Text(
                            'Cost ${_money(product['cost_price_minor'], widget.currency)}',
                            style: TextStyle(color: mutedColor, fontSize: 10.5),
                          ),
                          Text(
                            'Margin ${(((((product['price_minor'] as num) - (product['cost_price_minor'] as num)) / ((product['price_minor'] as num) == 0 ? 1 : (product['price_minor'] as num))) * 100).round())}%',
                            style: TextStyle(color: mutedColor, fontSize: 10.5),
                          ),
                        ],
                        const SizedBox(height: 6),
                        _StockBadge(stock: stock, active: active),
                        PopupMenuButton<String>(
                          padding: EdgeInsets.zero,
                          iconSize: 20,
                          onSelected: (action) {
                            if (action == 'edit') widget.onEdit(product);
                            if (action == 'toggle') widget.onToggle(product);
                            if (action == 'delete') widget.onDelete(product);
                          },
                          itemBuilder: (_) => [
                            const PopupMenuItem(
                              value: 'edit',
                              child: Text('Edit'),
                            ),
                            PopupMenuItem(
                              value: 'toggle',
                              child: Text(active ? 'Deactivate' : 'Activate'),
                            ),
                            const PopupMenuItem(
                              value: 'delete',
                              child: Text('Remove'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, Color primaryColor) {
    final selected = _filter == value;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _filter = value),
      selectedColor: primaryColor.withValues(alpha: 0.18),
      checkmarkColor: primaryColor,
      labelStyle: TextStyle(
        fontSize: 12.5,
        fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        color: selected ? primaryColor : null,
      ),
    );
  }
}

class _CustomersTab extends StatefulWidget {
  const _CustomersTab({
    required this.customers,
    required this.onAdd,
    required this.onEdit,
    required this.onDelete,
    required this.onOrders,
    required this.onImport,
    required this.canManage,
    required this.canSell,
  });
  final List<Map<String, dynamic>> customers;
  final VoidCallback onAdd;
  final ValueChanged<Map<String, dynamic>> onEdit, onDelete, onOrders;
  final VoidCallback onImport;
  final bool canManage, canSell;

  @override
  State<_CustomersTab> createState() => _CustomersTabState();
}

class _CustomersTabState extends State<_CustomersTab> {
  String search = '';
  @override
  Widget build(BuildContext context) {
    final customers = widget.customers
        .where(
          (c) => '${c['name']} ${c['email'] ?? ''} ${c['phone'] ?? ''}'
              .toLowerCase()
              .contains(search.toLowerCase()),
        )
        .toList();
    final muted = Theme.of(context).brightness == Brightness.dark
        ? _mutedDark
        : _mutedLight;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
      children: [
        if (widget.canSell)
          Align(
            alignment: Alignment.centerRight,
            child: Wrap(
              spacing: 8,
              children: [
                if (widget.canSell)
                  OutlinedButton.icon(
                    onPressed: widget.onImport,
                    icon: const Icon(Icons.upload_file),
                    label: const Text('Import CSV'),
                  ),
                FilledButton.icon(
                  onPressed: widget.onAdd,
                  icon: const Icon(Icons.person_add_alt_1),
                  label: const Text('Add customer'),
                ),
              ],
            ),
          ),
        const SizedBox(height: 12),
        TextField(
          onChanged: (v) => setState(() => search = v),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            hintText: 'Search customers',
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'CUSTOMER DIRECTORY',
          style: TextStyle(
            color: Theme.of(context).colorScheme.primary,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Your customers',
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        Text(
          '${widget.customers.length} customer profiles',
          style: TextStyle(color: muted, fontSize: 13),
        ),
        const SizedBox(height: 16),
        if (customers.isEmpty)
          const _EmptyMessage('Add a customer profile to link purchases.'),
        ...customers.map(
          (customer) => Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              leading: CircleAvatar(
                child: Text(_initials(customer['name'] as String? ?? '')),
              ),
              title: Text(
                customer['name'] as String? ?? 'Customer',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                [customer['email'], customer['phone']]
                    .whereType<String>()
                    .where((value) => value.isNotEmpty)
                    .join(' · ')
                    .ifEmpty('No contact details'),
              ),
              isThreeLine: false,
              onTap: () => widget.onOrders(customer),
              trailing: PopupMenuButton<String>(
                onSelected: (v) {
                  if (v == 'orders') widget.onOrders(customer);
                  if (v == 'edit') widget.onEdit(customer);
                  if (v == 'delete') widget.onDelete(customer);
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: 'orders',
                    child: Text('Purchase history'),
                  ),
                  if (widget.canManage)
                    const PopupMenuItem(value: 'edit', child: Text('Edit')),
                  if (widget.canManage)
                    const PopupMenuItem(value: 'delete', child: Text('Delete')),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

extension on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}

class _SalesTab extends StatefulWidget {
  const _SalesTab({
    required this.sales,
    required this.currency,
    required this.customers,
    required this.products,
    required this.canManage,
    required this.onEdit,
    required this.onDelete,
    required this.onImport,
    required this.onExport,
    required this.dateRange,
    required this.onDateRange,
    required this.canSell,
    required this.onPrint,
  });
  final List<Map<String, dynamic>> sales, customers, products;
  final String currency;
  final bool canManage;
  final ValueChanged<Map<String, dynamic>> onEdit, onDelete;
  final VoidCallback onImport, onExport;
  final DateTimeRange? dateRange;
  final VoidCallback onDateRange;
  final bool canSell;
  final ValueChanged<Map<String, dynamic>> onPrint;
  @override
  State<_SalesTab> createState() => _SalesTabState();
}

class _SalesTabState extends State<_SalesTab> {
  String search = '';
  @override
  Widget build(BuildContext context) {
    final rows = widget.sales
        .where(
          (s) =>
              search.isEmpty ||
              s['id'].toString().contains(search) ||
              (s['items'] as List<dynamic>).any(
                (i) => (i['product_name'] as String).toLowerCase().contains(
                  search.toLowerCase(),
                ),
              ),
        )
        .toList();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        OutlinedButton.icon(
          onPressed: widget.onDateRange,
          icon: const Icon(Icons.calendar_month),
          label: Text(
            widget.dateRange == null
                ? 'Last 30 days'
                : '${_dateOnly(widget.dateRange!.start)} – ${_dateOnly(widget.dateRange!.end)}',
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            if (widget.canSell)
              OutlinedButton.icon(
                onPressed: widget.onImport,
                icon: const Icon(Icons.upload_file),
                label: const Text('Import CSV'),
              ),
            OutlinedButton.icon(
              onPressed: widget.onExport,
              icon: const Icon(Icons.download),
              label: const Text('Export CSV'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextField(
          onChanged: (v) => setState(() => search = v.trim()),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            hintText: 'Search sale ID or product',
          ),
        ),
        const SizedBox(height: 12),
        Text(
          '${rows.length} sales in the selected reporting period',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (rows.isEmpty) const _EmptyMessage('No sales in this period.'),
        ...rows.map(
          (s) => Card(
            child: ExpansionTile(
              title: Text(
                '#${s['id'].toString().padLeft(5, '0')} · ${_money(s['total_minor'], widget.currency)}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                '${s['external_reference'] == null ? 'Manual sale' : 'CSV import'} · ${_localDate(s['created_at'] as String?)}',
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      ...(s['items'] as List<dynamic>).map(
                        (i) => ListTile(
                          dense: true,
                          title: Text('${i['quantity']}× ${i['product_name']}'),
                          trailing: Text(
                            _money(
                              (i['unit_price_minor'] as num).toInt() *
                                  (i['quantity'] as num).toInt(),
                              widget.currency,
                            ),
                          ),
                        ),
                      ),
                      OverflowBar(
                        children: [
                          TextButton.icon(
                            onPressed: () => widget.onPrint(s),
                            icon: const Icon(Icons.print_outlined),
                            label: const Text('Print receipt'),
                          ),
                          if (widget.canManage) ...[
                            TextButton.icon(
                              onPressed: () => widget.onEdit(s),
                              icon: const Icon(Icons.edit_outlined),
                              label: const Text('Edit'),
                            ),
                            TextButton.icon(
                              onPressed: () => widget.onDelete(s),
                              icon: const Icon(Icons.delete_outline),
                              label: const Text('Delete'),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _AnalyticsTab extends StatelessWidget {
  const _AnalyticsTab({
    required this.summary,
    required this.trend,
    required this.topProducts,
    required this.currency,
    required this.products,
    required this.customers,
    required this.interval,
    required this.onInterval,
    required this.dateRange,
    required this.onDateRange,
    required this.customerId,
    required this.productId,
    required this.onFilters,
  });
  final Map<String, dynamic> summary;
  final List<Map<String, dynamic>> trend, topProducts, products, customers;
  final String currency, interval;
  final ValueChanged<String> onInterval;
  final DateTimeRange? dateRange;
  final VoidCallback onDateRange;
  final int? customerId, productId;
  final void Function(int?, int?) onFilters;
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Revenue analytics',
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: onDateRange,
          icon: const Icon(Icons.calendar_month),
          label: Text(
            dateRange == null
                ? 'Last 30 days'
                : '${_dateOnly(dateRange!.start)} – ${_dateOnly(dateRange!.end)}',
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: interval,
          decoration: const InputDecoration(labelText: 'Trend interval'),
          items: ['day', 'week', 'month']
              .map(
                (x) => DropdownMenuItem(value: x, child: Text(x.toUpperCase())),
              )
              .toList(),
          onChanged: (v) {
            if (v != null) onInterval(v);
          },
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<int?>(
          initialValue: customerId,
          decoration: const InputDecoration(labelText: 'Filter by customer'),
          items: [
            const DropdownMenuItem<int?>(
              value: null,
              child: Text('All customers'),
            ),
            ...customers.map(
              (c) => DropdownMenuItem<int?>(
                value: (c['id'] as num).toInt(),
                child: Text(c['name'] as String),
              ),
            ),
          ],
          onChanged: (v) => onFilters(v, productId),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<int?>(
          initialValue: productId,
          decoration: const InputDecoration(labelText: 'Filter by product'),
          items: [
            const DropdownMenuItem<int?>(
              value: null,
              child: Text('All products'),
            ),
            ...products.map(
              (p) => DropdownMenuItem<int?>(
                value: (p['id'] as num).toInt(),
                child: Text(p['name'] as String),
              ),
            ),
          ],
          onChanged: (v) => onFilters(customerId, v),
        ),
        const SizedBox(height: 12),
        _MetricCard(
          title: 'Revenue',
          value: _money(summary['revenue_minor'], currency),
          icon: Icons.trending_up,
          tone: _MetricTone.green,
        ),
        const SizedBox(height: 8),
        _MetricCard(
          title: 'Gross profit',
          value: summary['gross_profit_minor'] == null
              ? 'Cost data incomplete'
              : _money(summary['gross_profit_minor'], currency),
          icon: Icons.account_balance,
          tone: _MetricTone.blue,
        ),
        const SizedBox(height: 8),
        _MetricCard(
          title: 'Orders · average value',
          value:
              '${summary['order_count'] ?? 0} · ${_money(summary['average_order_value_minor'], currency)}',
          icon: Icons.receipt_long,
          tone: _MetricTone.amber,
        ),
        const SizedBox(height: 18),
        _SectionCard(
          title: 'Sales trend',
          subtitle: 'Revenue per $interval',
          child: SizedBox(
            height: 180,
            child: trend.isEmpty
                ? const _EmptyMessage('No sales activity in this period')
                : CustomPaint(
                    painter: _TrendPainter(
                      trend,
                      isDark: Theme.of(context).brightness == Brightness.dark,
                    ),
                    child: const SizedBox.expand(),
                  ),
          ),
        ),
        const SizedBox(height: 12),
        _SectionCard(
          title: 'Top products',
          subtitle: 'By revenue',
          child: Column(
            children: topProducts.isEmpty
                ? [const _EmptyMessage('No product sales in this period')]
                : topProducts
                      .take(10)
                      .map(
                        (p) => ListTile(
                          title: Text(p['product_name'] as String),
                          subtitle: Text('${p['units_sold']} units sold'),
                          trailing: Text(_money(p['revenue_minor'], currency)),
                        ),
                      )
                      .toList(),
          ),
        ),
      ],
    );
  }
}

class _NewSaleTab extends StatefulWidget {
  const _NewSaleTab({
    required this.products,
    required this.currency,
    required this.api,
    required this.onSaved,
    required this.customers,
  });
  final List<Map<String, dynamic>> products;
  final String currency;
  final SmartBizApi api;
  final VoidCallback onSaved;
  final List<Map<String, dynamic>> customers;

  @override
  State<_NewSaleTab> createState() => _NewSaleTabState();
}

class _NewSaleTabState extends State<_NewSaleTab> {
  final Map<int, int> _quantities = {};
  final TextEditingController _barcode = TextEditingController();
  String _search = '';
  String? _scanNotice;
  bool _saving = false;
  String? _error;
  int? _customerId;

  int get _total => widget.products.fold(0, (sum, product) {
    final id = (product['id'] as num).toInt();
    final price = (product['price_minor'] as num).toInt();
    return sum + price * (_quantities[id] ?? 0);
  });

  int get _itemCount => _quantities.values.fold(0, (sum, q) => sum + q);

  @override
  void dispose() {
    _barcode.dispose();
    super.dispose();
  }

  void _scanProduct(String value) {
    final code = value.trim().toLowerCase();
    final match = widget.products
        .where(
          (p) =>
              (p['sku'] as String? ?? '').toLowerCase() == code ||
              (p['barcode'] as String? ?? '').toLowerCase() == code ||
              (p['name'] as String? ?? '').toLowerCase() == code,
        )
        .firstOrNull;
    if (match == null) {
      setState(
        () => _scanNotice =
            'No product matches "$value". Check the barcode or SKU.',
      );
      return;
    }
    final id = (match['id'] as num).toInt();
    final stock = (match['stock_quantity'] as num? ?? 0).toInt();
    if (match['active'] != true || stock < 1) {
      setState(
        () => _scanNotice = '${match['name']} is not available in stock.',
      );
      return;
    }
    if ((_quantities[id] ?? 0) >= stock) {
      setState(
        () => _scanNotice =
            'Cart quantity already uses all available stock for ${match['name']}.',
      );
      return;
    }
    setState(() {
      _quantities[id] = (_quantities[id] ?? 0) + 1;
      _scanNotice = 'Added ${match['name']} to the sale.';
      _barcode.clear();
    });
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.api.recordSale(_quantities, customerId: _customerId);
      if (!mounted) return;
      setState(_quantities.clear);
      _customerId = null;
      widget.onSaved();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sale recorded successfully! Stock deducted.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? _greenDark : _green;
    final inkColor = isDark ? _inkDark : _inkLight;
    final mutedColor = isDark ? _mutedDark : _mutedLight;

    final available = widget.products
        .where(
          (item) =>
              item['active'] == true &&
              ((item['stock_quantity'] as num?)?.toInt() ?? 0) > 0,
        )
        .where((item) {
          final q = _search.toLowerCase().trim();
          if (q.isEmpty) return true;
          final name = (item['name'] as String? ?? '').toLowerCase();
          return name.contains(q);
        })
        .toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 25),
      children: [
        Text(
          'CHECKOUT REGISTER',
          style: TextStyle(
            color: primaryColor,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Record New Sale',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: inkColor,
            letterSpacing: -0.6,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Add items to cart and check out instantly.',
          style: TextStyle(color: mutedColor, fontSize: 13),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _barcode,
          autofocus: true,
          textInputAction: TextInputAction.go,
          onSubmitted: _scanProduct,
          decoration: InputDecoration(
            labelText: 'Fast barcode / SKU scan',
            hintText: 'Scan or type a SKU, then press Enter',
            prefixIcon: const Icon(Icons.qr_code_scanner),
            suffixIcon: IconButton(
              onPressed: () => _scanProduct(_barcode.text),
              icon: const Icon(Icons.add_circle_outline),
            ),
          ),
        ),
        if (_scanNotice != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              _scanNotice!,
              style: TextStyle(
                color: _scanNotice!.startsWith('Added')
                    ? primaryColor
                    : const Color(0xFFBE123C),
                fontSize: 12,
              ),
            ),
          ),
        const SizedBox(height: 12),
        TextField(
          onChanged: (val) => setState(() => _search = val),
          decoration: const InputDecoration(
            hintText: 'Filter items for sale...',
            prefixIcon: Icon(Icons.search, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        DropdownButtonFormField<int?>(
          value: _customerId,
          decoration: const InputDecoration(
            labelText: 'Customer (optional)',
            prefixIcon: Icon(Icons.person_outline),
          ),
          items: [
            const DropdownMenuItem<int?>(
              value: null,
              child: Text('Walk-in customer'),
            ),
            ...widget.customers.map(
              (c) => DropdownMenuItem<int?>(
                value: (c['id'] as num).toInt(),
                child: Text(c['name'] as String),
              ),
            ),
          ],
          onChanged: (value) => setState(() => _customerId = value),
        ),
        const SizedBox(height: 14),
        if (available.isEmpty)
          const _EmptyMessage('No in-stock products available'),
        ...available.map((product) {
          final id = (product['id'] as num).toInt();
          final quantity = _quantities[id] ?? 0;
          final stock = (product['stock_quantity'] as num).toInt();
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: primaryColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.shopping_bag_outlined,
                      color: primaryColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product['name'] as String,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: inkColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 13.5,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${_money(product['price_minor'], widget.currency)} · $stock in stock',
                          style: TextStyle(color: mutedColor, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  _QuantityControl(
                    value: quantity,
                    max: stock,
                    onChanged: (value) => setState(
                      () => _quantities[id] = value.clamp(0, stock).toInt(),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
        if (_error != null) ...[
          const SizedBox(height: 10),
          _ErrorBanner(message: _error!),
        ],
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total Order Value',
                        style: TextStyle(color: mutedColor, fontSize: 13),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$_itemCount ${_itemCount == 1 ? "unit" : "units"} selected',
                        style: TextStyle(
                          color: primaryColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  _money(_total, widget.currency),
                  style: TextStyle(
                    color: inkColor,
                    fontWeight: FontWeight.w800,
                    fontSize: 22,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        FilledButton.icon(
          onPressed: _saving || _total == 0 ? null : _save,
          icon: _saving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.check_circle_outline),
          label: Text(
            _saving ? 'Recording sale…' : 'Complete Sale & Deduct Stock',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          style: FilledButton.styleFrom(
            backgroundColor: primaryColor,
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
      ],
    );
  }
}

class _QuantityControl extends StatelessWidget {
  const _QuantityControl({
    required this.value,
    required this.max,
    required this.onChanged,
  });
  final int value;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? _greenDark : _green;
    final inkColor = isDark ? _inkDark : _inkLight;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton.filledTonal(
          onPressed: value > 0 ? () => onChanged(value - 1) : null,
          icon: const Icon(Icons.remove, size: 16),
          visualDensity: VisualDensity.compact,
          style: IconButton.styleFrom(foregroundColor: primaryColor),
        ),
        SizedBox(
          width: 32,
          child: Text(
            '$value',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 14,
              color: inkColor,
            ),
          ),
        ),
        IconButton.filledTonal(
          onPressed: value < max ? () => onChanged(value + 1) : null,
          icon: const Icon(Icons.add, size: 16),
          visualDensity: VisualDensity.compact,
          style: IconButton.styleFrom(foregroundColor: primaryColor),
        ),
      ],
    );
  }
}

enum _MetricTone { green, blue, amber, purple }

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.tone,
  });
  final String title;
  final String value;
  final IconData icon;
  final _MetricTone tone;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final inkColor = isDark ? _inkDark : _inkLight;
    final mutedColor = isDark ? _mutedDark : _mutedLight;

    Color iconColor;
    Color iconBg;

    switch (tone) {
      case _MetricTone.green:
        iconColor = isDark ? _greenDark : _green;
        iconBg = iconColor.withValues(alpha: 0.14);
        break;
      case _MetricTone.blue:
        iconColor = const Color(0xFF3B82F6);
        iconBg = iconColor.withValues(alpha: 0.14);
        break;
      case _MetricTone.amber:
        iconColor = const Color(0xFFF59E0B);
        iconBg = iconColor.withValues(alpha: 0.14);
        break;
      case _MetricTone.purple:
        iconColor = const Color(0xFF8B5CF6);
        iconBg = iconColor.withValues(alpha: 0.14);
        break;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              style: TextStyle(
                color: mutedColor,
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: TextStyle(
                  color: inkColor,
                  fontWeight: FontWeight.w800,
                  fontSize: 20,
                  letterSpacing: -0.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
    this.trailing,
  });
  final String title;
  final String subtitle;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final inkColor = isDark ? _inkDark : _inkLight;
    final mutedColor = isDark ? _mutedDark : _mutedLight;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: inkColor,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        subtitle,
                        style: TextStyle(color: mutedColor, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}

class _SaleRow extends StatelessWidget {
  const _SaleRow({required this.sale, required this.currency});
  final Map<String, dynamic> sale;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? _greenDark : _green;
    final inkColor = isDark ? _inkDark : _inkLight;
    final mutedColor = isDark ? _mutedDark : _mutedLight;

    final items = (sale['items'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>();
    final names = items
        .map((item) => item['product_name'] as String? ?? 'Item')
        .take(2)
        .join(', ');
    final date = DateTime.tryParse(sale['created_at'] as String? ?? '')
        ?.toLocal();
    final when = date == null
        ? 'Recently'
        : '${date.day}/${date.month} · ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: primaryColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.receipt_long_outlined,
              color: primaryColor,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '#${sale['id'].toString().padLeft(5, '0')}',
                  style: TextStyle(
                    fontSize: 13,
                    color: inkColor,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  names.isEmpty ? 'Sale' : names,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: mutedColor),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _money(sale['total_minor'], currency),
                style: TextStyle(
                  fontSize: 13.5,
                  color: inkColor,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 3),
              Text(when, style: TextStyle(fontSize: 11, color: mutedColor)),
            ],
          ),
        ],
      ),
    );
  }
}

class _StockBadge extends StatelessWidget {
  const _StockBadge({required this.stock, required this.active});
  final int stock;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final low = stock <= 10;
    final text = !active
        ? 'Inactive'
        : stock == 0
        ? 'Out of stock'
        : low
        ? '$stock left'
        : '$stock in stock';

    final Color badgeColor = !active || stock == 0
        ? const Color(0xFFEF4444)
        : low
        ? const Color(0xFFF59E0B)
        : (isDark ? _greenDark : _green);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: badgeColor,
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _EmptyMessage extends StatelessWidget {
  const _EmptyMessage(this.message);
  final String message;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mutedColor = isDark ? _mutedDark : _mutedLight;

    return Container(
      height: 110,
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox_outlined,
            color: mutedColor.withValues(alpha: 0.5),
            size: 28,
          ),
          const SizedBox(height: 8),
          Text(message, style: TextStyle(color: mutedColor, fontSize: 13)),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF1EE),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: const Color(0xFFFECDD3)),
    ),
    child: Row(
      children: [
        const Icon(Icons.error_outline, size: 18, color: Color(0xFFE11D48)),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            message,
            style: const TextStyle(color: Color(0xFFBE123C), fontSize: 12.5),
          ),
        ),
        if (onRetry != null)
          TextButton(
            onPressed: onRetry,
            child: const Text(
              'Retry',
              style: TextStyle(
                color: Color(0xFFBE123C),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
      ],
    ),
  );
}

class _TrendPainter extends CustomPainter {
  _TrendPainter(this.values, {required this.isDark});
  final List<Map<String, dynamic>> values;
  final bool isDark;

  @override
  void paint(Canvas canvas, Size size) {
    const left = 8.0, right = 4.0, top = 14.0, bottom = 12.0;
    final chartWidth = size.width - left - right;
    final chartHeight = size.height - top - bottom;
    final maxValue = values
        .map((item) => (item['revenue_minor'] as num? ?? 0).toDouble())
        .fold<double>(1, (a, b) => a > b ? a : b);

    final gridPaint = Paint()
      ..color = isDark ? const Color(0xFF27272A) : const Color(0xFFE2E8F0)
      ..strokeWidth = 1;

    for (var line = 0; line < 4; line++) {
      final y = top + chartHeight * line / 3;
      canvas.drawLine(
        Offset(left, y),
        Offset(size.width - right, y),
        gridPaint,
      );
    }

    if (values.isEmpty) return;

    final points = <Offset>[];
    for (var index = 0; index < values.length; index++) {
      final ratio = values.length == 1 ? 0.5 : index / (values.length - 1);
      final amount = (values[index]['revenue_minor'] as num? ?? 0).toDouble();
      points.add(
        Offset(
          left + chartWidth * ratio,
          top + chartHeight * (1 - amount / maxValue),
        ),
      );
    }

    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (var index = 1; index < points.length; index++) {
      final previous = points[index - 1];
      final current = points[index];
      final control = (current.dx - previous.dx) / 2;
      path.cubicTo(
        previous.dx + control,
        previous.dy,
        current.dx - control,
        current.dy,
        current.dx,
        current.dy,
      );
    }

    final area = Path.from(path)
      ..lineTo(points.last.dx, size.height - bottom)
      ..lineTo(points.first.dx, size.height - bottom)
      ..close();

    final primaryColor = isDark ? _greenDark : _green;

    canvas.drawPath(
      area,
      Paint()
        ..shader = LinearGradient(
          colors: [
            primaryColor.withValues(alpha: 0.35),
            primaryColor.withValues(alpha: 0.0),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ).createShader(Offset.zero & size),
    );

    canvas.drawPath(
      path,
      Paint()
        ..color = primaryColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.6
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );

    for (final point in [
      points.first,
      points[points.length ~/ 2],
      points.last,
    ]) {
      canvas.drawCircle(
        point,
        3.5,
        Paint()..color = isDark ? const Color(0xFF18181B) : Colors.white,
      );
      canvas.drawCircle(
        point,
        3.5,
        Paint()
          ..color = primaryColor
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _TrendPainter oldDelegate) =>
      oldDelegate.values != values || oldDelegate.isDark != isDark;
}

String _friendlyError(Object error) {
  if (error is SmartBizException) return error.message;
  return 'Could not reach SmartBiz. Check that the API is running and the device can reach it.';
}
