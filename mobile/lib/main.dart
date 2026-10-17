import 'package:flutter/material.dart';

import 'smartbiz_api.dart';

const _green = Color(0xFF17845C);
const _ink = Color(0xFF1D342B);
const _muted = Color(0xFF829087);
const _canvas = Color(0xFFF6F8F7);

void main() => runApp(const SmartBizApp());

class SmartBizApp extends StatelessWidget {
  const SmartBizApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'SmartBiz',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: _canvas,
      colorScheme: ColorScheme.fromSeed(seedColor: _green, primary: _green),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        titleTextStyle: TextStyle(
          color: _ink,
          fontSize: 19,
          fontWeight: FontWeight.w700,
        ),
        iconTheme: IconThemeData(color: _ink),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF9FBFA),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 13,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5ECE8)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5ECE8)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _green, width: 1.4),
        ),
        labelStyle: const TextStyle(color: _muted, fontSize: 13),
      ),
    ),
    home: const SignInPage(),
  );
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
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 28),
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: _green,
                        borderRadius: BorderRadius.circular(13),
                      ),
                      child: const Icon(
                        Icons.grid_view_rounded,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Text(
                      'smart',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 23,
                        color: _ink,
                        letterSpacing: -1,
                      ),
                    ),
                    const Text(
                      'biz',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 23,
                        color: _green,
                        letterSpacing: -1,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 46),
                Text(
                  _register ? 'Set up your business' : 'Welcome back',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 27,
                    color: _ink,
                    letterSpacing: -.6,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _register
                      ? 'Create an account to start managing sales.'
                      : 'Sign in to see your sales and inventory.',
                  style: const TextStyle(color: _muted, height: 1.45),
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
                        const SizedBox(height: 13),
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
                        const SizedBox(height: 13),
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
                      const SizedBox(height: 13),
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
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: _green,
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _register ? 'Create account' : 'Sign in',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
                const SizedBox(height: 17),
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
                    style: const TextStyle(
                      color: _green,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 34),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.lock_outline, size: 14, color: _muted),
                    SizedBox(width: 6),
                    Text(
                      'Your session stays on this device only',
                      style: TextStyle(color: _muted, fontSize: 11),
                    ),
                  ],
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
              width: 31,
              height: 31,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF5EF),
                borderRadius: BorderRadius.circular(9),
              ),
              child: const Icon(
                Icons.grid_view_rounded,
                color: _green,
                size: 17,
              ),
            ),
            const SizedBox(width: 9),
            const Text(
              'SmartBiz',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: _ink,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : _refresh,
            icon: const Icon(Icons.refresh_rounded),
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout') _signOut();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'logout', child: Text('Sign out')),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: CircleAvatar(
                radius: 16,
                backgroundColor: const Color(0xFFE7EDF6),
                child: Text(
                  _initials(widget.user['full_name'] as String? ?? 'SB'),
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF526B8A),
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
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFEAF5EF),
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
    return RefreshIndicator(
      onRefresh: () async => onRetry(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 21, 16, 24),
        children: [
          Text(
            'OVERVIEW',
            style: TextStyle(
              color: _green,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            'Good day, ${userName.split(' ').first}',
            style: const TextStyle(
              fontSize: 23,
              fontWeight: FontWeight.w800,
              color: _ink,
              letterSpacing: -.5,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            'Here’s how $businessName is doing.',
            style: const TextStyle(color: _muted, fontSize: 12),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  title: 'Revenue',
                  value: _money(summary['revenue_minor'], currency),
                  icon: Icons.trending_up,
                  tint: const Color(0xFFEAF5EF),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  title: 'Orders',
                  value: '${summary['order_count'] ?? '—'}',
                  icon: Icons.shopping_bag_outlined,
                  tint: const Color(0xFFEEF3FA),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  title: 'Avg. order',
                  value: _money(summary['average_order_value_minor'], currency),
                  icon: Icons.receipt_long_outlined,
                  tint: const Color(0xFFFBF3E9),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  title: 'Stock on hand',
                  value:
                      '${products.fold<int>(0, (sum, item) => sum + ((item['stock_quantity'] as num?)?.toInt() ?? 0))}',
                  icon: Icons.inventory_2_outlined,
                  tint: const Color(0xFFF2EFF8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Sales trend',
            subtitle: 'Revenue · last 30 days',
            trailing: loading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : null,
            child: SizedBox(
              height: 155,
              child: trend.isEmpty
                  ? const _EmptyMessage('Sales activity will appear here')
                  : CustomPaint(
                      painter: _TrendPainter(trend),
                      child: const SizedBox.expand(),
                    ),
            ),
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Recent sales',
            subtitle: 'Latest completed orders',
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
            const Padding(
              padding: EdgeInsets.all(22),
              child: Center(child: CircularProgressIndicator(color: _green)),
            ),
        ],
      ),
    );
  }
}

class _InventoryTab extends StatelessWidget {
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
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () async => onRetry(),
    child: ListView(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 24),
      children: [
        const Text(
          'INVENTORY',
          style: TextStyle(
            color: _green,
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.4,
          ),
        ),
        const SizedBox(height: 7),
        const Text(
          'Products & stock',
          style: TextStyle(
            fontSize: 23,
            fontWeight: FontWeight.w800,
            color: _ink,
            letterSpacing: -.5,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          '${products.length} products in your catalog',
          style: const TextStyle(color: _muted, fontSize: 12),
        ),
        const SizedBox(height: 18),
        if (loading && products.isEmpty)
          const Padding(
            padding: EdgeInsets.all(25),
            child: Center(child: CircularProgressIndicator(color: _green)),
          ),
        if (!loading && products.isEmpty)
          const _EmptyMessage('Your product catalog is empty'),
        ...products.map((product) {
          final stock = (product['stock_quantity'] as num? ?? 0).toInt();
          final active = product['active'] as bool? ?? true;
          return Container(
            margin: const EdgeInsets.only(bottom: 9),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE9EEEB)),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF5EF),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.inventory_2_outlined,
                    color: _green,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product['name'] as String? ?? 'Product',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: _ink,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'SKU ${product['sku'] ?? '—'}',
                        style: const TextStyle(color: _muted, fontSize: 10),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _money(product['price_minor'], currency),
                      style: const TextStyle(
                        color: _ink,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 5),
                    _StockBadge(stock: stock, active: active),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    ),
  );
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
  bool _saving = false;
  String? _error;

  int get _total => widget.products.fold(0, (sum, product) {
    final id = (product['id'] as num).toInt();
    final price = (product['price_minor'] as num).toInt();
    return sum + price * (_quantities[id] ?? 0);
  });

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
          content: Text('Sale recorded successfully'),
          backgroundColor: _green,
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
    final available = widget.products
        .where(
          (item) =>
              item['active'] == true &&
              ((item['stock_quantity'] as num?)?.toInt() ?? 0) > 0,
        )
        .toList();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 25),
      children: [
        const Text(
          'CHECKOUT',
          style: TextStyle(
            color: _green,
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.4,
          ),
        ),
        const SizedBox(height: 7),
        const Text(
          'Record a sale',
          style: TextStyle(
            fontSize: 23,
            fontWeight: FontWeight.w800,
            color: _ink,
            letterSpacing: -.5,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'Choose products and quantities to check out.',
          style: TextStyle(color: _muted, fontSize: 12),
        ),
        const SizedBox(height: 18),
        if (available.isEmpty)
          const _EmptyMessage('No in stock products available'),
        ...available.map((product) {
          final id = (product['id'] as num).toInt();
          final quantity = _quantities[id] ?? 0;
          final stock = (product['stock_quantity'] as num).toInt();
          return Container(
            margin: const EdgeInsets.only(bottom: 9),
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(13),
              border: Border.all(color: const Color(0xFFE9EEEB)),
            ),
            child: Row(
              children: [
                Container(
                  width: 39,
                  height: 39,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F6F3),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: const Icon(
                    Icons.shopping_bag_outlined,
                    color: _green,
                    size: 19,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product['name'] as String,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: _ink,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${_money(product['price_minor'], widget.currency)} · $stock available',
                        style: const TextStyle(color: _muted, fontSize: 10),
                      ),
                    ],
                  ),
                ),
                _QuantityControl(
                  value: quantity,
                  onChanged: (value) => setState(
                    () => _quantities[id] = value.clamp(0, stock).toInt(),
                  ),
                ),
              ],
            ),
          );
        }),
        if (_error != null) ...[
          const SizedBox(height: 7),
          _ErrorBanner(message: _error!),
        ],
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xFFE9EEEB)),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Total',
                  style: TextStyle(color: _muted, fontSize: 13),
                ),
              ),
              Text(
                _money(_total, widget.currency),
                style: const TextStyle(
                  color: _ink,
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 11),
        FilledButton.icon(
          onPressed: _saving || _total == 0 ? null : _save,
          icon: _saving
              ? const SizedBox(
                  width: 17,
                  height: 17,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.check_rounded),
          label: Text(_saving ? 'Saving sale…' : 'Complete sale'),
          style: FilledButton.styleFrom(
            backgroundColor: _green,
            minimumSize: const Size.fromHeight(50),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ],
    );
  }
}

class _QuantityControl extends StatelessWidget {
  const _QuantityControl({required this.value, required this.onChanged});
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      IconButton.filledTonal(
        onPressed: value > 0 ? () => onChanged(value - 1) : null,
        icon: const Icon(Icons.remove, size: 16),
        visualDensity: VisualDensity.compact,
        style: IconButton.styleFrom(
          backgroundColor: const Color(0xFFF1F5F2),
          foregroundColor: _green,
          disabledBackgroundColor: const Color(0xFFF7F8F7),
        ),
      ),
      SizedBox(
        width: 28,
        child: Text(
          '$value',
          textAlign: TextAlign.center,
          style: const TextStyle(fontWeight: FontWeight.w700, color: _ink),
        ),
      ),
      IconButton.filledTonal(
        onPressed: () => onChanged(value + 1),
        icon: const Icon(Icons.add, size: 16),
        visualDensity: VisualDensity.compact,
        style: IconButton.styleFrom(
          backgroundColor: const Color(0xFFEAF5EF),
          foregroundColor: _green,
        ),
      ),
    ],
  );
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.tint,
  });
  final String title;
  final String value;
  final IconData icon;
  final Color tint;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: const Color(0xFFE9EEEB)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: tint,
            borderRadius: BorderRadius.circular(9),
          ),
          child: Icon(icon, size: 17, color: _green),
        ),
        const SizedBox(height: 12),
        Text(title, style: const TextStyle(color: _muted, fontSize: 10)),
        const SizedBox(height: 4),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: const TextStyle(
              color: _ink,
              fontWeight: FontWeight.w800,
              fontSize: 18,
              letterSpacing: -.3,
            ),
          ),
        ),
      ],
    ),
  );
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
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(15),
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border.all(color: const Color(0xFFE9EEEB)),
      borderRadius: BorderRadius.circular(14),
    ),
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
                    style: const TextStyle(
                      color: _ink,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(color: _muted, fontSize: 10),
                  ),
                ],
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
        const SizedBox(height: 12),
        child,
      ],
    ),
  );
}

class _SaleRow extends StatelessWidget {
  const _SaleRow({required this.sale, required this.currency});
  final Map<String, dynamic> sale;
  final String currency;

  @override
  Widget build(BuildContext context) {
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
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F6F3),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.receipt_long_outlined,
              color: _green,
              size: 17,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '#${sale['id']}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: _ink,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  names.isEmpty ? 'Sale' : names,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10, color: _muted),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _money(sale['total_minor'], currency),
                style: const TextStyle(
                  fontSize: 11,
                  color: _ink,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 3),
              Text(when, style: const TextStyle(fontSize: 9, color: _muted)),
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
    final low = stock <= 5;
    final text = !active
        ? 'Inactive'
        : stock == 0
        ? 'Out of stock'
        : low
        ? '$stock left'
        : '$stock in stock';
    final color = !active || stock == 0
        ? const Color(0xFFB94E43)
        : low
        ? const Color(0xFFB17A33)
        : _green;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .09),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 9,
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
  Widget build(BuildContext context) => Container(
    height: 100,
    alignment: Alignment.center,
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.inbox_outlined, color: Colors.blueGrey.shade200, size: 25),
        const SizedBox(height: 7),
        Text(message, style: const TextStyle(color: _muted, fontSize: 11)),
      ],
    ),
  );
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF1EE),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Row(
      children: [
        const Icon(Icons.error_outline, size: 17, color: Color(0xFFA64435)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            message,
            style: const TextStyle(color: Color(0xFFA64435), fontSize: 11),
          ),
        ),
        if (onRetry != null)
          TextButton(onPressed: onRetry, child: const Text('Retry')),
      ],
    ),
  );
}

class _TrendPainter extends CustomPainter {
  _TrendPainter(this.values);
  final List<Map<String, dynamic>> values;

  @override
  void paint(Canvas canvas, Size size) {
    const left = 8.0, right = 4.0, top = 12.0, bottom = 10.0;
    final chartWidth = size.width - left - right;
    final chartHeight = size.height - top - bottom;
    final maxValue = values
        .map((item) => (item['revenue_minor'] as num? ?? 0).toDouble())
        .fold<double>(1, (a, b) => a > b ? a : b);
    final gridPaint = Paint()
      ..color = const Color(0xFFEDF1EF)
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
      final ratio = values.length == 1 ? .5 : index / (values.length - 1);
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
    canvas.drawPath(
      area,
      Paint()
        ..shader = const LinearGradient(
          colors: [Color(0x4434A979), Color(0x0034A979)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ).createShader(Offset.zero & size),
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = _green
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.3
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
    for (final point in [
      points.first,
      points[points.length ~/ 2],
      points.last,
    ]) {
      canvas.drawCircle(point, 3, Paint()..color = Colors.white);
      canvas.drawCircle(
        point,
        3,
        Paint()
          ..color = _green
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.5,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _TrendPainter oldDelegate) =>
      oldDelegate.values != values;
}

String _friendlyError(Object error) {
  if (error is SmartBizException) return error.message;
  return 'Could not reach SmartBiz. Check that the API is running and the device can reach it.';
}
