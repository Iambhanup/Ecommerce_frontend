const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5002';

const request = async (path, options = {}) => {
  try {
    const response = await fetch(`${API_BASE}${path}`, options);
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message = data?.message || text || `${response.status} ${response.statusText}` || 'Request failed';
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Unable to reach backend API. Start the server with `npm run server` and ensure it is listening on http://localhost:5002');
    }
    throw error;
  }
};

export const signUp = (payload) =>
  request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const signIn = (payload) =>
  request('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const fetchProducts = (token) =>
  request('/api/products', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const fetchCategories = () => request('/api/categories');

export const fetchCart = (token) =>
  request('/api/cart', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const addToCart = (token, productId) =>
  request('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId, quantity: 1 }),
  });

export const removeFromCart = (token, productId) =>
  request(`/api/cart/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateCartItem = (token, productId, quantity) =>
  request(`/api/cart/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quantity }),
  });

export const placeOrder = (token) =>
  request('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

export const fetchOrders = (token) =>
  request('/api/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const addCategory = (token, name) =>
  request('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });

export const addProduct = (token, payload) =>
  request('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

export const updateProduct = (token, id, payload) =>
  request(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

export const deleteProduct = (token, id) =>
  request(`/api/products/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

export const fetchUserMe = (token) =>
  request('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateProfile = (token, payload) =>
  request('/api/users/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

export const forgotPassword = (email, phone) =>
  request('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone }),
  });

export const resetPassword = (email, password, otp) =>
  request('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, otp }),
  });

export const verifyOtp = (email, otp) =>
  request('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });


