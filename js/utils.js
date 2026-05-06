// ─── utils.js ────────────────────────────────────────────────────
// Shared utilities used across all pages

const API_BASE_URL = 'http://localhost:4005/api';

// Store token in localStorage
function setToken(token) {
	localStorage.setItem('token', token);
}

function getToken() {
	return localStorage.getItem('token');
}

function removeToken() {
	localStorage.removeItem('token');
}

// API helper functions
async function apiRequest(endpoint, options = {}) {
	const url = `${API_BASE_URL}${endpoint}`;
	const token = getToken();

	const defaultHeaders = {
		'Content-Type': 'application/json',
		...(token && { 'Authorization': `Bearer ${token}` })
	};

	// Merge headers properly
	const mergedOptions = {
		...options,
		headers: {
			...defaultHeaders,
			...(options.headers || {})
		}
	};

	const response = await fetch(url, mergedOptions);
	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error || 'API request failed');
	}

	return data;
}

// Authentication functions
async function loginUser(email, password) {
	try {
		const data = await apiRequest('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password })
		});

		setToken(data.token);
		localStorage.setItem('user', JSON.stringify(data.user));
		return data.user;
	} catch (error) {
		throw new Error(error.message);
	}
}

async function registerUser(email, password, firstName, lastName, contactPhone, street, streetNumber, zipCode, latitude, longitude) {
	try {
		const data = await apiRequest('/auth/register', {
			method: 'POST',
			body: JSON.stringify({ email, password, firstName, lastName, contactPhone, street, streetNumber, zipCode, latitude, longitude })
		});

		setToken(data.token);
		localStorage.setItem('user', JSON.stringify(data.user));
		return data.user;
	} catch (error) {
		throw new Error(error.message);
	}
}

async function logoutUser() {
	removeToken();
	localStorage.removeItem('user');
	localStorage.removeItem('cart');
	window.location.reload();
}

// User profile functions
async function getUserProfile() {
	try {
		const data = await apiRequest('/users/profile');
		return data;
	} catch (error) {
		throw new Error(error.message);
	}
}

async function updateUserProfile(updates) {
	try {
		const data = await apiRequest('/users/profile', {
			method: 'PUT',
			body: JSON.stringify(updates)
		});
		return data;
	} catch (error) {
		throw new Error(error.message);
	}
}

// Address functions
async function getUserAddresses() {
	try {
		const data = await apiRequest('/users/addresses');
		return data;
	} catch (error) {
		throw new Error(error.message);
	}
}

async function addUserAddress(street, streetNumber, zipCode, latitude, longitude) {
	try {
		console.log('addUserAddress called with:', { street, streetNumber, zipCode, latitude, longitude });
		const token = getToken();
		console.log('Token exists:', !!token);
		const data = await apiRequest('/users/addresses', {
			method: 'POST',
			body: JSON.stringify({ street, streetNumber, zipCode, latitude, longitude })
		});
		console.log('API response:', data);
		return data;
	} catch (error) {
		console.error('addUserAddress error:', error);
		throw new Error(error.message);
	}
}

async function updateUserAddress(addressId, updates) {
	try {
		const data = await apiRequest(`/users/addresses/${addressId}`, {
			method: 'PUT',
			body: JSON.stringify(updates)
		});
		return data;
	} catch (error) {
		throw new Error(error.message);
	}
}

async function deleteUserAddress(addressId) {
	try {
		const data = await apiRequest(`/users/addresses/${addressId}`, {
			method: 'DELETE'
		});
		return data;
	} catch (error) {
		throw new Error(error.message);
	}
}

function updateAuthNav() {
	const authNav = document.getElementById('authNav');
	if (!authNav) return;

	const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('/pages/');
	const btnOutline = isRoot ? 'btn-outline-primary' : 'btn-outline-light';

	let currentFile = window.location.pathname.split('/').pop() || 'browse.html';
	if (isRoot) currentFile = 'browse.html';

	const userStr = localStorage.getItem('user');
	if (userStr) {
		const user = JSON.parse(userStr);
		const firstName = (user.firstName && user.firstName !== 'undefined') ? user.firstName : '';
		const lastName = (user.lastName && user.lastName !== 'undefined') ? user.lastName : '';
		const displayName = (firstName && lastName) ? `${firstName} ${lastName}`.trim() : (user.name || user.email || 'Λογαριασμός');
		authNav.innerHTML = `
			<a href="${isRoot ? 'pages/account.html' : 'account.html'}" class="btn btn-sm ${btnOutline} fw-bold me-2">${displayName}</a>
			<button onclick="logout()" class="btn btn-sm btn-danger fw-bold">Αποσύνδεση</button>
		`;
	} else {
		const loginPath = isRoot ? 'pages/login.html' : 'login.html';
		authNav.innerHTML = `
			<a href="${loginPath}" onclick="localStorage.setItem('redirectAfterLogin', '${currentFile}')" class="btn btn-sm fw-bold text-auth">Σύνδεση/Εγγραφή</a>
		`;
	}
}

function logout() {
	if (!confirm('Είστε σίγουρος ότι θέλετε να αποσυνδεθείτε;')) return;
	logoutUser();
}

function getCart() {
	const cartStr = localStorage.getItem('cart');
	return cartStr ? JSON.parse(cartStr) : [];
}

function addToCart(item) {
	const cart = getCart();
	cart.push(item);
	localStorage.setItem('cart', JSON.stringify(cart));
	updateCartBadge();
}

function removeFromCart(name) {
	const cart = getCart();
	const idx = cart.findLastIndex(item => item.name === name);
	if (idx !== -1) {
		cart.splice(idx, 1);
		localStorage.setItem('cart', JSON.stringify(cart));
		updateCartBadge();
	}
}

function getItemCount(name) {
	return getCart().filter(item => item.name === name).length;
}

function updateCartBadge() {
	const cartBadge = document.getElementById('cartBadge');
	if (!cartBadge) return;
	cartBadge.textContent = getCart().length;
}

async function addAddressToUser(street, number, zip = '', lat = null, lon = null) {
	try {
		await addUserAddress(street, number, zip, lat, lon);
		return true;
	} catch (error) {
		console.error('Failed to add address:', error);
		return false;
	}
}

function extractAddressParts(address = {}) {
  return {
	street:
	  address.road ||
	  address.pedestrian ||
	  address.footway ||
	  address.residential ||
	  address.path ||
	  '',

	number:
	  address.house_number ||
	  address.housenumber ||
	  '',

	zipCode:
	  address.postcode || ''
  };
}

function fillAddressFields(address, fieldIds) {
  if (!fieldIds) return;

  const parts = extractAddressParts(address);

  if (fieldIds.streetId) {
	const streetEl = document.getElementById(fieldIds.streetId);
	if (streetEl) streetEl.value = parts.street;
  }

  if (fieldIds.numberId) {
	const numberEl = document.getElementById(fieldIds.numberId);
	if (numberEl) numberEl.value = parts.number;
  }

  if (fieldIds.zipId) {
	const zipEl = document.getElementById(fieldIds.zipId);
	if (zipEl) zipEl.value = parts.zipCode;
  }

  return parts;
}

async function searchAddresses(query) {
  try {
	if (!query || query.trim().length < 3) return [];

	const response = await fetch(
	  `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=gr&addressdetails=1&limit=5`
	);

	const data = await response.json();

	return data.map(item => ({
	  displayName: item.display_name,
	  lat: parseFloat(item.lat),
	  lon: parseFloat(item.lon),
	  address: item.address || {},
	  parts: extractAddressParts(item.address || {})
	}));
  } catch (error) {
	console.error('Address search failed:', error);
	return [];
  }
}

/**
 * Shared map initialization logic
 */
//NEW: SEARCH LOCATION
function initLeafletMap(containerId, onLocationSelected, options = {}) {
  // Default: Athens Center (Syntagma)
  const defaultLocation = [37.9755, 23.7348];
  const map = L.map(containerId).setView(defaultLocation, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let marker = L.marker(defaultLocation, { draggable: true }).addTo(map);
  let searchResults = [];
  let debounceTimer = null;

  async function notifyLocationSelected(lat, lon) {
	if (onLocationSelected) {
	  await onLocationSelected(lat, lon);
	}
  }

  // Try to get user GPS
  if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(
	  async (position) => {
		const { latitude, longitude } = position.coords;
		const newPos = [latitude, longitude];
		map.setView(newPos, 16);
		marker.setLatLng(newPos);
		await notifyLocationSelected(latitude, longitude);
	  },
	  () => {
		console.warn('Geolocation denied or failed. Using default.');
	  }
	);
  }

  marker.on('dragend', async function () {
	const position = marker.getLatLng();
	await notifyLocationSelected(position.lat, position.lng);
  });

  map.on('click', async function (event) {
	const { lat, lng } = event.latlng;
	marker.setLatLng([lat, lng]);
	await notifyLocationSelected(lat, lng);
  });

  // Address autocomplete support
  if (options.searchInputId && options.resultsContainerId) {
	const input = document.getElementById(options.searchInputId);
	const resultsContainer = document.getElementById(options.resultsContainerId);

	const clearResults = () => {
	  if (!resultsContainer) return;
	  resultsContainer.innerHTML = '';
	  resultsContainer.classList.add('d-none');
	};

	const renderResults = (results) => {
	  if (!resultsContainer) return;

	  if (!results.length) {
		resultsContainer.innerHTML = `
		  <button type="button" class="list-group-item list-group-item-action disabled">
			Δεν βρέθηκαν διευθύνσεις
		  </button>
		`;
		resultsContainer.classList.remove('d-none');
		return;
	  }

	  resultsContainer.innerHTML = results.map((item, index) => `
		<button
		  type="button"
		  class="list-group-item list-group-item-action"
		  data-address-index="${index}"
		>
		  ${item.displayName}
		</button>
	  `).join('');

	  resultsContainer.classList.remove('d-none');

	  const buttons = resultsContainer.querySelectorAll('[data-address-index]');
	  buttons.forEach(btn => {
		btn.addEventListener('click', async () => {
			const index = parseInt(btn.getAttribute('data-address-index'), 10);
			const selected = searchResults[index];
			if (!selected) return;

			map.setView([selected.lat, selected.lon], 17);
			marker.setLatLng([selected.lat, selected.lon]);

			const parts = extractAddressParts(selected.address);

			if (input) {
			input.value = [parts.street, parts.number, parts.zipCode]
				.filter(Boolean)
				.join(', ');
			}

			clearResults();

			if (options.onAddressPicked) {
			options.onAddressPicked(selected);
			}

			await notifyLocationSelected(selected.lat, selected.lon);
		});
	  });
	};

	if (input) {
	  input.addEventListener('input', () => {
		clearTimeout(debounceTimer);

		const query = input.value.trim();

		if (query.length < 3) {
		  clearResults();
		  return;
		}

		debounceTimer = setTimeout(async () => {
		  searchResults = await searchAddresses(query);
		  renderResults(searchResults);
		}, 350);
	  });

	  input.addEventListener('blur', () => {
		setTimeout(() => clearResults(), 200);
	  });
	}
  }

  // Fix for map not rendering correctly inside modals/tabs
  setTimeout(() => map.invalidateSize(), 200);

  return { map, marker };
}

/**
 * Reverse Geocoding using Nominatim
 */
async function reverseGeocode(lat, lon) {
	try {
		const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
		const data = await response.json();
		return data.address;
	} catch (error) {
		console.error('Reverse Geocoding failed:', error);
		return null;
	}
}
