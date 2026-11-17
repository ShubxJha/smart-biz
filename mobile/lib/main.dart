import 'package:flutter/material.dart';

import 'smartbiz_api.dart';

// Brand Accent Colors
const _green = Color(0xFF059669);
const _greenDark = Color(0xFF10B981);
const _inkLight = Color(0xFF0F172A);
const _inkDark = Color(0xFFF4F4F5);
const _mutedLight = Color(0xFF64748B);
const _mutedDark = Color(0xFF94A3B8);

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
    cardTheme: CardTheme(
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
    cardTheme: CardTheme(
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
      final user = data['user'] as Map<String, dynamic>;
      final memberships = data['memberships'] as List<dynamic>;
      final business =
          (memberships.first as Map<String, dynamic>)['business']
              as Map<String, dynamic>;
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
                icon: Icon(isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
                onPressed: () {
                  themeModeNotifier.value =
                      isDark ? ThemeMode.light : ThemeMode.dark;
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
                                  value == null || value.length < (_register ? 8 : 1)
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
                          Icon(Icons.shield_outlined, size: 15, color: mutedColor),
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
  List<Map<String, dynamic>> _trend = [];

  String get _currency => widget.business['currency'] as String? ?? 'INR';

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
        widget.api.summary(),
        widget.api.sales(),
        widget.api.products(),
        widget.api.salesTrend(),
      ]);
      if (!mounted) return;
      setState(() {
        _summary = results[0] as Map<String, dynamic>;
        _sales = results[1] as List<Map<String, dynamic>>;
        _products = results[2] as List<Map<String, dynamic>>;
        _trend = results[3] as List<Map<String, dynamic>>;
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
      _InventoryTab(
        products: _products,
        currency: _currency,
        loading: _loading,
        onRetry: _refresh,
      ),
      _NewSaleTab(
        products: _products,
        currency: _currency,
        api: widget.api,
        onSaved: _refresh,
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
              themeModeNotifier.value =
                  isDark ? ThemeMode.light : ThemeMode.dark;
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
            },
            itemBuilder: (_) => const [
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
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2_rounded),
            label: 'Inventory',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle),
            label: 'New sale',
          ),
        ],
      ),
    );
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
                    child: CircularProgressIndicator(strokeWidth: 2, color: primaryColor),
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
              child: Center(child: CircularProgressIndicator(color: primaryColor)),
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
  });
  final List<Map<String, dynamic>> products;
  final String currency;
  final bool loading;
  final VoidCallback onRetry;

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
      if (_filter == 'low_stock') return stock <= 5;
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: () async => widget.onRetry(),
      color: primaryColor,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
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
                _buildFilterChip('All (${widget.products.length})', 'all', primaryColor),
                const SizedBox(width: 8),
                _buildFilterChip('Active only', 'active', primaryColor),
                const SizedBox(width: 8),
                _buildFilterChip('Low stock (≤5)', 'low_stock', primaryColor),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (widget.loading && widget.products.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator(color: primaryColor)),
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
                        const SizedBox(height: 6),
                        _StockBadge(stock: stock, active: active),
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

class _NewSaleTab extends StatefulWidget {
  const _NewSaleTab({
    required this.products,
    required this.currency,
    required this.api,
    required this.onSaved,
  });
  final List<Map<String, dynamic>> products;
  final String currency;
  final SmartBizApi api;
  final VoidCallback onSaved;

  @override
  State<_NewSaleTab> createState() => _NewSaleTabState();
}

class _NewSaleTabState extends State<_NewSaleTab> {
  final Map<int, int> _quantities = {};
  String _search = '';
  bool _saving = false;
  String? _error;

  int get _total => widget.products.fold(0, (sum, product) {
    final id = (product['id'] as num).toInt();
    final price = (product['price_minor'] as num).toInt();
    return sum + price * (_quantities[id] ?? 0);
  });

  int get _itemCount => _quantities.values.fold(0, (sum, q) => sum + q);

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.api.recordSale(_quantities);
      if (!mounted) return;
      setState(_quantities.clear);
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
          onChanged: (val) => setState(() => _search = val),
          decoration: const InputDecoration(
            hintText: 'Filter items for sale...',
            prefixIcon: Icon(Icons.search, size: 20),
          ),
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
                        style: TextStyle(color: primaryColor, fontSize: 12, fontWeight: FontWeight.w600),
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
  const _QuantityControl({required this.value, required this.max, required this.onChanged});
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
          style: IconButton.styleFrom(
            foregroundColor: primaryColor,
          ),
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
          style: IconButton.styleFrom(
            foregroundColor: primaryColor,
          ),
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
                  '#${String(sale['id']).padLeft(5, '0')}',
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
    final low = stock <= 5;
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
          Icon(Icons.inbox_outlined, color: mutedColor.withValues(alpha: 0.5), size: 28),
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
            child: const Text('Retry', style: TextStyle(color: Color(0xFFBE123C), fontWeight: FontWeight.bold)),
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
      canvas.drawCircle(point, 3.5, Paint()..color = isDark ? const Color(0xFF18181B) : Colors.white);
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
