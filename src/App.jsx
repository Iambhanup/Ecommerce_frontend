import { useEffect, useMemo, useState } from 'react';
import Login from './Login.jsx';
import { products as sampleProducts } from './data/products.js';
import {
  fetchProducts,
  fetchCategories,
  fetchCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  placeOrder,
  fetchOrders,
  fetchUserMe,
  addCategory,
  addProduct,
  updateProduct,
  deleteProduct,
  updateProfile,
} from './api.js';

const formatPrice = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function App() {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem('digitalStoreUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [page, setPage] = useState(user ? 'store' : 'home');
  const [authMode, setAuthMode] = useState('signin');
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('digitalStoreToken') || '';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    image: '',
  });
  const [profileOpen, setProfileOpen] = useState(false);

  // Payment State Variables
  const [paymentMethod, setPaymentMethod] = useState('credit_card'); // 'credit_card', 'debit_card', 'netbanking', 'cod'
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const getRouteFromState = (pageState, modeState) => {
    if (pageState === 'store') return '/store';
    if (pageState === 'orders') return '/orders';
    if (pageState === 'admin') return '/admin';
    if (pageState === 'payment') return '/payment';
    if (pageState === 'login') {
      if (modeState === 'signup') return '/signup';
      if (modeState === 'forgot') return '/forgot';
      return '/signin';
    }
    return '/';
  };

  const getStateFromPath = (pathName) => {
    const normalized = pathName.replace(/\/\/+$/, '') || '/';
    if (normalized === '/store') return { page: 'store', authMode: 'signin' };
    if (normalized === '/orders') return { page: 'orders', authMode: 'signin' };
    if (normalized === '/admin') return { page: 'admin', authMode: 'signin' };
    if (normalized === '/payment') return { page: 'payment', authMode: 'signin' };
    if (normalized === '/signup') return { page: 'login', authMode: 'signup' };
    if (normalized === '/forgot') return { page: 'login', authMode: 'forgot' };
    if (normalized === '/signin') return { page: 'login', authMode: 'signin' };
    return { page: 'home', authMode: 'signin' };
  };

  const navigate = (nextPage, nextAuthMode, replace = false) => {
    setPage(nextPage);
    setAuthMode(nextAuthMode || 'signin');
    const nextState = { page: nextPage, authMode: nextAuthMode || 'signin' };
    const nextUrl = getRouteFromState(nextPage, nextState.authMode);
    if (replace) {
      window.history.replaceState(nextState, '', nextUrl);
    } else {
      window.history.pushState(nextState, '', nextUrl);
    }
  };

  useEffect(() => {
    const initState = getStateFromPath(window.location.pathname);
    const initialPage = user ? (['store', 'orders', 'admin', 'payment'].includes(initState.page) ? initState.page : 'store') : initState.page;
    const initialAuthMode = user ? 'signin' : initState.authMode;
    setPage(initialPage);
    setAuthMode(initialAuthMode);
    window.history.replaceState({ page: initialPage, authMode: initialAuthMode }, '', getRouteFromState(initialPage, initialAuthMode));

    const handlePopState = (event) => {
      const state = event.state;
      if (state && state.page) {
        const protectedPages = ['store', 'orders', 'admin', 'payment'];
        if (user && !protectedPages.includes(state.page)) {
          const leave = window.confirm('You are signed in. Do you want to logout and leave the dashboard?');
          if (!leave) {
            window.history.pushState({ page: 'store', authMode: 'signin' }, '', getRouteFromState('store', 'signin'));
            setPage('store');
            setAuthMode('signin');
            return;
          }
          setUser(null);
          setToken('');
          setCartItems([]);
          setSearchTerm('');
          setCheckoutMessage('');
          setProfileOpen(false);
          window.localStorage.removeItem('digitalStoreUser');
          window.localStorage.removeItem('digitalStoreToken');
        }

        if (state.page !== 'home' && !user) {
          setPage('home');
          setAuthMode('signin');
          return;
        }

        setPage(state.page);
        setAuthMode(state.authMode || 'signin');
        return;
      }
      const parsed = getStateFromPath(window.location.pathname);
      setPage(parsed.page);
      setAuthMode(parsed.authMode);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  useEffect(() => {
    if (user && (page === 'home' || page === 'login')) {
      navigate('store', 'signin', true);
    }
  }, [user]);

  // Pre-fill card details from saved user profile
  useEffect(() => {
    if (page === 'payment' && user) {
      setCardNumber(user.cardNumber || '');
      setCardHolderName(user.cardHolderName || '');
      setCardExpiry(user.cardExpiry || '');
      setCardCvv('');
      setSaveCard(false);
      setPaymentError('');
    }
  }, [page, user]);

  const loadShopData = async () => {
    if (!token) return;
    try {
      const [productList, categoryList, cart, orderList] = await Promise.all([
        fetchProducts(token),
        fetchCategories(),
        fetchCart(token),
        fetchOrders(token),
      ]);
      setProducts(productList);
      setCategories(categoryList);
      const enrichedCart = cart.map((item) => {
        const product = productList.find((product) => product.id === item.productId);
        return {
          ...item,
          product,
        };
      });
      setCartItems(enrichedCart);
      setOrders(orderList);
    } catch (error) {
      console.error('Failed to load shop data', error.message);
    }
  };

  useEffect(() => {
    loadShopData();
  }, [token]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, products]);

  const handleAddToCart = async (product) => {
    if (!token) {
      setCheckoutMessage('Please sign in before adding items to cart.');
      return;
    }
    try {
      await addToCart(token, product.id);
      await loadShopData();
      setCheckoutMessage('Added to cart successfully.');
    } catch (error) {
      setCheckoutMessage(error.message);
    }
  };

  const handleRemoveFromCart = async (productId) => {
    if (!token) return;
    try {
      await removeFromCart(token, productId);
      await loadShopData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleQuantityChange = async (productId, quantity) => {
    if (!token) return;
    try {
      await updateCartItem(token, productId, quantity);
      await loadShopData();
    } catch (error) {
      console.error(error);
    }
  };

  const totalPrice = cartItems.reduce(
    (total, item) => total + (item.product?.price || 0) * item.quantity,
    0
  );

  const handleCheckout = () => {
    if (!cartItems.length) {
      setCheckoutMessage('Add products to the cart before checkout.');
      return;
    }
    if (!token) {
      setCheckoutMessage('Please sign in to complete the purchase.');
      return;
    }
    setCheckoutMessage('');
    setPaymentError('');
    navigate('payment', 'signin');
  };

  const handleProcessPaymentAndOrder = async (e) => {
    e.preventDefault();
    setPaymentError('');
    setIsProcessing(true);

    if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
      if (!cardNumber.trim()) {
        setPaymentError('Card number is required.');
        setIsProcessing(false);
        return;
      }
      const rawCard = cardNumber.replace(/\s/g, '');
      if (!/^\d{12,19}$/.test(rawCard)) {
        setPaymentError('Invalid card number. Must be between 12 and 19 digits.');
        setIsProcessing(false);
        return;
      }
      if (!cardHolderName.trim()) {
        setPaymentError('Cardholder name is required.');
        setIsProcessing(false);
        return;
      }
      if (!cardExpiry.trim()) {
        setPaymentError('Expiry date is required.');
        setIsProcessing(false);
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(cardExpiry.trim())) {
        setPaymentError('Invalid expiry format. Use MM/YY.');
        setIsProcessing(false);
        return;
      }
      if (!cardCvv.trim()) {
        setPaymentError('CVV is required.');
        setIsProcessing(false);
        return;
      }
      if (!/^\d{3,4}$/.test(cardCvv.trim())) {
        setPaymentError('CVV must be 3 or 4 digits.');
        setIsProcessing(false);
        return;
      }
    } else if (paymentMethod === 'netbanking') {
      if (!selectedBank) {
        setPaymentError('Please select a bank.');
        setIsProcessing(false);
        return;
      }
    }

    try {
      if ((paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && saveCard) {
        const updatedUser = await updateProfile(token, {
          cardNumber: cardNumber.trim(),
          cardHolderName: cardHolderName.trim(),
          cardExpiry: cardExpiry.trim(),
        });
        const mergedUser = { ...user, ...updatedUser };
        setUser(mergedUser);
        window.localStorage.setItem('digitalStoreUser', JSON.stringify(mergedUser));
      }

      await placeOrder(token, paymentMethod);
      await loadShopData();
      setCheckoutMessage('Thank you! Your digital products are ready to download.');
      navigate('orders', 'signin');
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCategory = async () => {
    if (!token) {
      setAdminMessage('Admin token is missing.');
      return;
    }
    if (!newCategoryName.trim()) {
      setAdminMessage('Enter a category name.');
      return;
    }
    try {
      await addCategory(token, newCategoryName.trim());
      setNewCategoryName('');
      setAdminMessage('Category created successfully.');
      await loadShopData();
    } catch (error) {
      setAdminMessage(error.message);
    }
  };

  const handleAddProduct = async () => {
    if (!token) {
      setAdminMessage('Admin token is missing.');
      return;
    }
    if (!newProduct.name.trim() || !newProduct.description.trim() || !newProduct.price || !newProduct.category.trim()) {
      setAdminMessage('Please fill in all required product fields.');
      return;
    }
    try {
      await addProduct(token, {
        ...newProduct,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock) || 0,
      });
      setNewProduct({ name: '', description: '', price: '', category: '', stock: '', image: '' });
      setAdminMessage('Product created successfully.');
      await loadShopData();
    } catch (error) {
      setAdminMessage(error.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!token) return;
    try {
      await deleteProduct(token, productId);
      await loadShopData();
    } catch (error) {
      setAdminMessage(error.message);
    }
  };

  const handleLogin = (authenticatedUser) => {
    setUser(authenticatedUser);
    setToken(authenticatedUser.token || '');
    window.localStorage.setItem('digitalStoreUser', JSON.stringify(authenticatedUser));
    window.localStorage.setItem('digitalStoreToken', authenticatedUser.token || '');
    navigate('store', 'signin');
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    setCartItems([]);
    setSearchTerm('');
    setCheckoutMessage('');
    setProfileOpen(false);
    window.localStorage.removeItem('digitalStoreUser');
    window.localStorage.removeItem('digitalStoreToken');
    navigate('home', 'signin');
  };

  const handleAuthRedirect = (mode) => {
    navigate('login', mode);
  };

  const pageHeading = page === 'orders'
    ? 'Your orders'
    : page === 'admin'
    ? 'Admin dashboard'
    : page === 'payment'
    ? 'Checkout payment'
    : 'Browse products';

  const pageSubtitle = page === 'orders'
    ? 'Review past purchases and order status.'
    : page === 'admin'
    ? 'Manage categories, products, and orders.'
    : page === 'payment'
    ? 'Enter payment details to complete your purchase securely.'
    : 'Find the digital products you need and add them to your cart.';

  if (!user && page === 'home') {
    return (
      <div className="home-shell">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="eyebrow">Digital Products Store</p>
            <h1>Buy premium digital assets in one place</h1>
            <p>
              Explore ebooks, templates, audio packs, icons, and marketing toolkits. Sign in or sign up to start shopping and instantly
              download your purchases.
            </p>
            <div className="home-action-row">
              <button className="primary-button" onClick={() => handleAuthRedirect('signin')}>
                Sign in
              </button>
              <button className="secondary-button" onClick={() => handleAuthRedirect('signup')}>
                Sign up
              </button>
            </div>
          </div>

          <div className="home-hero-image">
            <img
              src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80"
              alt="Digital product workspace"
            />
          </div>
        </section>

        <section className="home-highlights">
          <article className="highlight-card">
            <h3>Instant downloads</h3>
            <p>Get access to your digital products immediately after purchase.</p>
          </article>
          <article className="highlight-card">
            <h3>Curated collection</h3>
            <p>Top-quality assets chosen for creators, entrepreneurs, and small teams.</p>
          </article>
          <article className="highlight-card">
            <h3>Secure checkout</h3>
            <p>Safe payment flow and fast access to all your purchased files.</p>
          </article>
        </section>

        <section className="home-products">
          <div className="section-title">
            <h2>Featured products</h2>
            <p>Choose from our most popular digital downloads.</p>
          </div>
          <div className="home-product-grid">
            {sampleProducts.slice(0, 4).map((product) => (
              <article key={product.id} className="home-product-card">
                <img src={product.image} alt={product.name} />
                <div>
                  <p className="product-category">{product.category}</p>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                </div>
                <strong className="price">{formatPrice(product.price)}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (!user && page === 'login') {
    return (
      <Login
        mode={authMode}
        onLogin={handleLogin}
        onBack={() => navigate('home', 'signin')}
        onForgot={() => navigate('login', 'forgot')}
        onAuthModeChange={(mode) => navigate('login', mode)}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Digital Products Store</p>
          <div className="user-headline">
            <h1>Welcome back, {user.name}</h1>
            <p className="login-status">{pageSubtitle}</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <label htmlFor="search">Search products</label>
            <input
              id="search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, category, or feature"
            />
          </div>
          <div className="header-buttons">
            <div className="dashboard-nav">
              <button className={page === 'store' ? 'nav-button active' : 'nav-button'} onClick={() => navigate('store', 'signin')}>
                Store
              </button>
              <button className={page === 'orders' ? 'nav-button active' : 'nav-button'} onClick={() => navigate('orders', 'signin')}>
                Orders
              </button>
              {user?.role === 'admin' && (
                <button className={page === 'admin' ? 'nav-button active' : 'nav-button'} onClick={() => navigate('admin', 'signin')}>
                  Admin
                </button>
              )}
            </div>
            <div className="profile-menu">
              <button
                type="button"
                className="profile-button"
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="profile-icon">👤</span>
                <span className="profile-button-label">Profile</span>
              </button>
              {profileOpen && (
                <div className="profile-popup">
                  <div className="profile-popup-header">
                    <span className="profile-popup-title">Profile details</span>
                    <button
                      type="button"
                      className="profile-close"
                      onClick={() => setProfileOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="profile-field">
                    <span>Name</span>
                    <strong>{user.name}</strong>
                  </div>
                  <div className="profile-field">
                    <span>Email</span>
                    <strong>{user.email}</strong>
                  </div>
                  <div className="profile-field">
                    <span>Phone</span>
                    <strong>{user.phone || 'N/A'}</strong>
                  </div>
                  <div className="profile-field">
                    <span>Address</span>
                    <strong>{user.address || 'N/A'}</strong>
                  </div>
                  {user.cardNumber && (
                    <div className="profile-field">
                      <span>Saved Card</span>
                      <strong>
                        {user.cardNumber.replace(/\s/g, '').replace(/\d(?=\d{4})/g, '*')}
                        {user.cardExpiry ? ` (${user.cardExpiry})` : ''}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {page === 'store' && (
        <main className="content-grid">
          <section className="product-list">
            <div className="section-title">
              <h2>Products</h2>
              <p>{filteredProducts.length} items found</p>
            </div>

            {filteredProducts.length ? (
              <div className="cards">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="product-card">
                    <div>
                      <p className="product-category">{product.category}</p>
                      <h3>{product.name}</h3>
                      <p className="product-description">{product.description}</p>
                    </div>
                    <div className="product-footer">
                      <span className="price">{formatPrice(product.price)}</span>
                      <button onClick={() => handleAddToCart(product)}>Add to cart</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No products match your search.</h3>
                <p>Try another keyword or clear the search field.</p>
              </div>
            )}
          </section>

          <aside className="cart-panel">
            <div className="section-title">
              <h2>Cart</h2>
              <p>{cartItems.length} item(s)</p>
            </div>

            {cartItems.length ? (
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.productId} className="cart-item">
                    <div>
                      <p>{item.product?.name || 'Unknown product'}</p>
                      <p className="cart-meta">
                        {item.quantity} × {formatPrice(item.product?.price || 0)}
                      </p>
                    </div>
                    <button className="remove-button" onClick={() => handleRemoveFromCart(item.productId)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Your cart is empty. Add products to start checkout.</p>
              </div>
            )}

            <div className="checkout-box">
              <div className="checkout-row">
                <span>Total</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>
              <button className="checkout-button" onClick={handleCheckout}>
                Complete purchase
              </button>
              {checkoutMessage && <p className="checkout-message">{checkoutMessage}</p>}
            </div>
          </aside>
        </main>
      )}

      {page === 'payment' && (
        <main className="content-grid payment-shell">
          <section className="product-list payment-form-panel">
            <div className="section-title">
              <h2>Select Payment Method</h2>
            </div>
            
            <div className="payment-methods-grid">
              <button
                type="button"
                className={`method-button ${paymentMethod === 'credit_card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('credit_card')}
              >
                <span className="method-icon">💳</span>
                <span className="method-label">Credit Card</span>
              </button>
              
              <button
                type="button"
                className={`method-button ${paymentMethod === 'debit_card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('debit_card')}
              >
                <span className="method-icon">💳</span>
                <span className="method-label">Debit Card</span>
              </button>
              
              <button
                type="button"
                className={`method-button ${paymentMethod === 'netbanking' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('netbanking')}
              >
                <span className="method-icon">🏦</span>
                <span className="method-label">Net Banking</span>
              </button>
              
              <button
                type="button"
                className={`method-button ${paymentMethod === 'cod' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <span className="method-icon">💵</span>
                <span className="method-label">Cash on Delivery</span>
              </button>
            </div>

            <form onSubmit={handleProcessPaymentAndOrder} className="payment-form-body">
              {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (
                <div className="card-input-section">
                  <div className="card-mockup-wrapper">
                    <div className="virtual-card">
                      <div className="virtual-card-chip"></div>
                      <div className="virtual-card-number">
                        {cardNumber
                          ? cardNumber.replace(/\s?/g, '').replace(/(.{4})/g, '$1 ').trim()
                          : '•••• •••• •••• ••••'}
                      </div>
                      <div className="virtual-card-footer">
                        <div className="virtual-card-holder">
                          <span className="virtual-card-label">Card Holder</span>
                          <div className="virtual-card-value">
                            {cardHolderName ? cardHolderName.toUpperCase() : 'YOUR NAME'}
                          </div>
                        </div>
                        <div className="virtual-card-expiry">
                          <span className="virtual-card-label">Expires</span>
                          <div className="virtual-card-value">{cardExpiry || 'MM/YY'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-fields-grid">
                    <div className="input-group">
                      <label htmlFor="card-number">Card Number</label>
                      <input
                        id="card-number"
                        type="text"
                        maxLength="19"
                        placeholder="1234 5678 1234 5678"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const formatted = val.replace(/(.{4})/g, '$1 ').trim();
                          setCardNumber(formatted);
                        }}
                        required
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="card-holder">Card Holder Name</label>
                      <input
                        id="card-holder"
                        type="text"
                        placeholder="John Doe"
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="input-row">
                      <div className="input-group">
                        <label htmlFor="card-expiry">Expiry Date (MM/YY)</label>
                        <input
                          id="card-expiry"
                          type="text"
                          maxLength="5"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 2) {
                              val = val.substring(0, 2) + '/' + val.substring(2, 4);
                            }
                            setCardExpiry(val);
                          }}
                          required
                        />
                      </div>

                      <div className="input-group">
                        <label htmlFor="card-cvv">CVV</label>
                        <input
                          id="card-cvv"
                          type="password"
                          maxLength="4"
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          required
                        />
                      </div>
                    </div>

                    <div className="save-card-checkbox">
                      <input
                        id="save-card"
                        type="checkbox"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                      />
                      <label htmlFor="save-card">
                        Save this card to my profile for future purchases
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'netbanking' && (
                <div className="netbanking-section">
                  <div className="input-group">
                    <label htmlFor="bank-select">Select Your Bank</label>
                    <select
                      id="bank-select"
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      required
                    >
                      <option value="">-- Choose a Bank --</option>
                      <option value="sbi">State Bank of India (SBI)</option>
                      <option value="hdfc">HDFC Bank</option>
                      <option value="icici">ICICI Bank</option>
                      <option value="axis">Axis Bank</option>
                      <option value="kotak">Kotak Mahindra Bank</option>
                      <option value="pnb">Punjab National Bank</option>
                    </select>
                  </div>
                  <div className="netbanking-info">
                    <p>You will be redirected to your bank's secure page to complete the transaction.</p>
                  </div>
                </div>
              )}

              {paymentMethod === 'cod' && (
                <div className="cod-section">
                  <div className="cod-info-box">
                    <p className="cod-warning-title">Cash on Delivery details</p>
                    <p>
                      Since you are buying digital assets, our support team will contact you to collect payment.
                      Once payment is confirmed, your files will be instantly unlocked for download under your Orders tab.
                    </p>
                  </div>
                </div>
              )}

              {paymentError && <p className="payment-error-message">{paymentError}</p>}

              <div className="payment-action-buttons">
                <button
                  type="button"
                  className="secondary-button payment-cancel-btn"
                  onClick={() => navigate('store', 'signin')}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button payment-submit-btn"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : `Pay ${formatPrice(totalPrice)}`}
                </button>
              </div>
            </form>
          </section>

          <aside className="cart-panel payment-summary-panel">
            <div className="section-title">
              <h2>Order Summary</h2>
            </div>
            <div className="payment-summary-box">
              <div className="summary-items">
                {cartItems.map((item) => (
                  <div key={item.productId} className="summary-item">
                    <div className="summary-item-details">
                      <span className="summary-item-name">{item.product?.name || 'Unknown product'}</span>
                      <span className="summary-item-qty">Qty: {item.quantity}</span>
                    </div>
                    <span className="summary-item-price">
                      {formatPrice((item.product?.price || 0) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="checkout-box" style={{ border: 'none', padding: '16px 0 0', boxShadow: 'none' }}>
                <div className="checkout-row">
                  <span>Grand Total</span>
                  <strong>{formatPrice(totalPrice)}</strong>
                </div>
              </div>
            </div>
          </aside>
        </main>
      )}

      {page === 'orders' && (
        <section className="order-history">
          <div className="section-title">
            <h2>Order history</h2>
            <p>{user?.role === 'admin' ? 'All orders in the store' : 'Your recent purchases'}</p>
          </div>
          {orders.length ? (
            <div className="cards">
              {orders.map((order) => (
                <article key={order.id} className="product-card">
                  <div>
                    <p className="product-category">Order #{order.id}</p>
                    <h3>Status: {order.status}</h3>
                    <p>{order.items.length} item(s) · {formatPrice(order.total)}</p>
                  </div>
                  <div className="product-footer">
                    <span>{new Date(order.placedAt).toLocaleDateString()}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No orders have been placed yet.</p>
            </div>
          )}
        </section>
      )}

      {page === 'admin' && user?.role === 'admin' && (
        <section className="admin-panel">
          <div className="section-title">
            <h2>Admin portal</h2>
            <p>Manage categories, products, and orders for the store.</p>
          </div>
          <div className="admin-grid">
            <div className="admin-card">
              <h3>Create category</h3>
              <input
                type="text"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Category name"
              />
              <button className="secondary-button" onClick={handleAddCategory}>
                Add category
              </button>
            </div>
            <div className="admin-card">
              <h3>Add product</h3>
              <input
                type="text"
                value={newProduct.name}
                onChange={(event) => setNewProduct((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Product name"
              />
              <input
                type="text"
                value={newProduct.description}
                onChange={(event) => setNewProduct((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Description"
              />
              <input
                type="number"
                value={newProduct.price}
                onChange={(event) => setNewProduct((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="Price"
              />
              <input
                type="text"
                value={newProduct.category}
                onChange={(event) => setNewProduct((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="Category"
              />
              <input
                type="number"
                value={newProduct.stock}
                onChange={(event) => setNewProduct((prev) => ({ ...prev, stock: event.target.value }))}
                placeholder="Stock"
              />
              <input
                type="text"
                value={newProduct.image}
                onChange={(event) => setNewProduct((prev) => ({ ...prev, image: event.target.value }))}
                placeholder="Image URL"
              />
              <button className="secondary-button" onClick={handleAddProduct}>
                Create product
              </button>
            </div>
          </div>
          {adminMessage && <p className="admin-message">{adminMessage}</p>}
          <div className="admin-table">
            <h3>Product management</h3>
            {products.length ? (
              <div className="admin-product-list">
                {products.map((product) => (
                  <div key={product.id} className="admin-product-row">
                    <div>
                      <strong>{product.name}</strong>
                      <p>{product.category} · {formatPrice(product.price)}</p>
                    </div>
                    <button className="remove-button" onClick={() => handleDeleteProduct(product.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No products available yet.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
