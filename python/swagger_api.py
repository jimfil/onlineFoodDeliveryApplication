import os
from dotenv import load_dotenv
from flask import Flask
from flask_restx import Api, Resource, fields

# Load .env from logofood-app directory
load_dotenv(dotenv_path='../logofood-app/.env')

app = Flask(__name__)
api = Api(app, version='1.0', title='LogoFood API',
          description='Swagger documentation for the LogoFood online delivery platform routes.',
          doc='/swagger/')

# Namespaces
auth_ns = api.namespace('Auth', description='Authentication and Registration operations', path='/')
index_ns = api.namespace('Public', description='Public pages and browsing', path='/')
cart_ns = api.namespace('Cart', description='Shopping cart and checkout operations', path='/')
user_ns = api.namespace('User', description='Customer account and tracking', path='/')
restaurant_ns = api.namespace('Restaurant', description='Restaurant management and public view', path='/')

# ---------------- Models ----------------
login_model = api.model('Login', {
    'email': fields.String(required=True, description='Email address'),
    'password': fields.String(required=True, description='Password')
})

register_model = api.model('Register', {
    'email': fields.String(required=True),
    'password': fields.String(required=True),
    'firstName': fields.String(required=True),
    'lastName': fields.String(required=True),
    'contactPhone': fields.String(required=True),
    'street': fields.String(required=True),
    'streetNumber': fields.String(required=True),
    'zipCode': fields.String(required=True),
    'latitude': fields.Float(),
    'longitude': fields.Float()
})

restaurant_register_step1_model = api.model('RestaurantRegisterStep1', {
    'email': fields.String(required=True),
    'password': fields.String(required=True),
    'firstNameOwner': fields.String(required=True),
    'lastNameOwner': fields.String(required=True)
})

restaurant_register_step2_model = api.model('RestaurantRegisterStep2', {
    'businessName': fields.String(required=True),
    'phone': fields.String(required=True),
    'afm': fields.String(required=True),
    'estimatedPreparationTime': fields.Integer(),
    'minOrderValue': fields.Float(),
    'openingTime': fields.String(),
    'closingTime': fields.String(),
    'street': fields.String(required=True),
    'streetNumber': fields.String(required=True),
    'zipCode': fields.String(required=True),
    'latitude': fields.Float(),
    'longitude': fields.Float()
})

cart_add_model = api.model('CartAdd', {
    'productId': fields.Integer(required=True),
    'name': fields.String(required=True),
    'price': fields.Float(required=True),
    'restaurantId': fields.Integer(required=True)
})

cart_remove_model = api.model('CartRemove', {
    'productId': fields.Integer(required=True)
})

cart_checkout_model = api.model('CartCheckout', {
    'addressId': fields.Integer(description='ID of saved address'),
    'floor': fields.String(required=True),
    'comments': fields.String(),
    'phone': fields.String(required=True),
    'street': fields.String(description='Required for guests'),
    'streetNumber': fields.String(description='Required for guests'),
    'zipCode': fields.String(description='Required for guests')
})

profile_model = api.model('ProfileUpdate', {
    'firstName': fields.String(required=True),
    'lastName': fields.String(required=True),
    'contactPhone': fields.String(required=True)
})

address_model = api.model('Address', {
    'street': fields.String(required=True),
    'streetNumber': fields.String(required=True),
    'zipCode': fields.String(required=True),
    'latitude': fields.Float(),
    'longitude': fields.Float(),
    'floor': fields.String(),
    'comments': fields.String()
})

rate_model = api.model('RateOrder', {
    'rating': fields.Float(required=True, min=1, max=5)
})

product_model = api.model('Product', {
    'name': fields.String(required=True),
    'price': fields.Float(required=True),
    'description': fields.String(),
    'categoryId': fields.Integer(),
    'newCategoryName': fields.String(description='If creating a new category'),
    'imageUrl': fields.String()
})

reorder_model = api.model('Reorder', {
    'type': fields.String(required=True, description="'category' or 'product'"),
    'id': fields.Integer(required=True),
    'direction': fields.String(required=True, description="'up' or 'down'")
})

categories_model = api.model('CategoriesUpdate', {
    'categories': fields.List(fields.Integer(), description='List of category IDs')
})

status_model = api.model('OrderStatusUpdate', {
    'status': fields.String(required=True)
})

icon_model = api.model('IconUpdate', {
    'imageUrl': fields.String(required=True)
})
order_response_model = api.model('OrderResponse', {
    'id': fields.Integer(description='Order ID'),
    'created_at': fields.DateTime(description='Creation timestamp'),
    'completed_at': fields.DateTime(description='Completion timestamp'),
    'status': fields.String(description='Order status'),
    'delivery_address_text': fields.String(description='Snapshot of delivery address'),
    'total': fields.Float(description='Total price')
})


# ---------------- Auth Routes ----------------
@auth_ns.route('/login')
class Login(Resource):
    @auth_ns.doc('show_login')
    def get(self):
        """Render the login page"""
        pass

    @auth_ns.expect(login_model)
    @auth_ns.doc('process_login')
    def post(self):
        """Process user/restaurant login"""
        pass

@auth_ns.route('/register')
class Register(Resource):
    @auth_ns.doc('show_register')
    def get(self):
        """Render the customer registration page"""
        pass

    @auth_ns.expect(register_model)
    @auth_ns.doc('process_register')
    def post(self):
        """Process customer registration"""
        pass

@auth_ns.route('/register-restaurant')
class RegisterRestaurant(Resource):
    @auth_ns.doc('show_register_restaurant_step1')
    def get(self):
        """Render restaurant registration (Step 1)"""
        pass

@auth_ns.route('/register-restaurant/step1')
class RegisterRestaurantStep1(Resource):
    @auth_ns.expect(restaurant_register_step1_model)
    @auth_ns.doc('process_register_restaurant_step1')
    def post(self):
        """Process restaurant registration (Step 1)"""
        pass

@auth_ns.route('/register-restaurant/step2')
class RegisterRestaurantStep2(Resource):
    @auth_ns.doc('show_register_restaurant_step2')
    def get(self):
        """Render restaurant registration (Step 2)"""
        pass

    @auth_ns.expect(restaurant_register_step2_model)
    @auth_ns.doc('process_register_restaurant_step2')
    def post(self):
        """Process restaurant registration (Step 2)"""
        pass

@auth_ns.route('/logout')
class Logout(Resource):
    @auth_ns.doc('logout_user')
    def get(self):
        """Log out the current user/restaurant"""
        pass


# ---------------- Public Routes ----------------
@index_ns.route('/')
class Index(Resource):
    @index_ns.doc('landing_page')
    def get(self):
        """Render the landing page"""
        pass

@index_ns.route('/browse')
class Browse(Resource):
    @index_ns.doc('browse_restaurants')
    def get(self):
        """Fetch all restaurants and render the browse page"""
        pass

@index_ns.route('/restaurant/<int:id>')
class RestaurantView(Resource):
    @index_ns.doc('view_restaurant_menu')
    def get(self, id):
        """Render the public menu view for a specific restaurant"""
        pass


# ---------------- Cart Routes ----------------
@cart_ns.route('/cart')
class Cart(Resource):
    @cart_ns.doc('view_cart')
    def get(self):
        """Render the shopping cart page"""
        pass

@cart_ns.route('/cart/count')
class CartCount(Resource):
    @cart_ns.doc('get_cart_count')
    def get(self):
        """Return the number of items in the cart (for UI badge)"""
        pass

@cart_ns.route('/cart/add')
class CartAdd(Resource):
    @cart_ns.expect(cart_add_model)
    @cart_ns.doc('add_to_cart')
    def post(self):
        """Add an item to the session cart"""
        pass

@cart_ns.route('/cart/remove')
class CartRemove(Resource):
    @cart_ns.expect(cart_remove_model)
    @cart_ns.doc('remove_from_cart')
    def post(self):
        """Reduce quantity or remove an item from the session cart"""
        pass

@cart_ns.route('/cart/delete')
class CartDelete(Resource):
    @cart_ns.expect(cart_remove_model)
    @cart_ns.doc('delete_from_cart')
    def post(self):
        """Remove an entire product from the session cart"""
        pass

@cart_ns.route('/cart/clear')
class CartClear(Resource):
    @cart_ns.doc('clear_cart')
    def post(self):
        """Empty the entire session cart"""
        pass

@cart_ns.route('/cart/checkout')
class CartCheckout(Resource):
    @cart_ns.expect(cart_checkout_model)
    @cart_ns.doc('checkout_cart')
    def post(self):
        """Process the checkout and create an order"""
        pass


# ---------------- User Routes ----------------
@user_ns.route('/account')
class Account(Resource):
    @user_ns.doc('view_account')
    def get(self):
        """Render the user account/profile page"""
        pass

@user_ns.route('/account/profile')
class AccountProfile(Resource):
    @user_ns.expect(profile_model)
    @user_ns.doc('update_profile')
    def post(self):
        """Update user profile information"""
        pass

@user_ns.route('/account/addresses')
class AccountAddresses(Resource):
    @user_ns.expect(address_model)
    @user_ns.doc('add_address')
    def post(self):
        """Add a new delivery address"""
        pass

@user_ns.route('/account/addresses/<int:id>/edit')
class AccountAddressEdit(Resource):
    @user_ns.expect(address_model)
    @user_ns.doc('edit_address')
    def post(self, id):
        """Edit an existing delivery address"""
        pass

@user_ns.route('/account/addresses/<int:id>/delete')
class AccountAddressDelete(Resource):
    @user_ns.doc('delete_address')
    def post(self, id):
        """Delete a delivery address"""
        pass

@user_ns.route('/track-orders')
class TrackOrders(Resource):
    @user_ns.doc('track_orders')
    @user_ns.response(200, 'Success', [order_response_model])
    def get(self):
        """Render the live order tracking page for the customer"""
        pass

@user_ns.route('/orders/<int:id>/rate')
class OrderRate(Resource):
    @user_ns.expect(rate_model)
    @user_ns.doc('rate_order')
    def post(self, id):
        """Submit a rating for a completed order"""
        pass


# ---------------- Restaurant Routes ----------------
@restaurant_ns.route('/manage/orders')
class ManageOrders(Resource):
    @restaurant_ns.doc('manage_orders')
    @restaurant_ns.response(200, 'Success', [order_response_model])
    def get(self):
        """Render the order management dashboard for restaurants"""
        pass

@restaurant_ns.route('/manage/orders/<int:id>/status')
class ManageOrderStatus(Resource):
    @restaurant_ns.expect(status_model)
    @restaurant_ns.doc('update_order_status')
    def post(self, id):
        """Update the status of a specific order (e.g., PENDING -> PREPARING)"""
        pass

@restaurant_ns.route('/manage/products')
class ManageProducts(Resource):
    @restaurant_ns.expect(product_model)
    @restaurant_ns.doc('add_product')
    def post(self):
        """Add a new product to the restaurant menu"""
        pass

@restaurant_ns.route('/manage/products/<int:id>/delete')
class ManageProductDelete(Resource):
    @restaurant_ns.doc('delete_product')
    def post(self, id):
        """Delete a product from the restaurant menu"""
        pass

@restaurant_ns.route('/manage/categories')
class ManageCategories(Resource):
    @restaurant_ns.expect(categories_model)
    @restaurant_ns.doc('update_categories')
    def post(self):
        """Update the active categories for the restaurant"""
        pass

@restaurant_ns.route('/manage/reorder')
class ManageReorder(Resource):
    @restaurant_ns.expect(reorder_model)
    @restaurant_ns.doc('reorder_items')
    def post(self):
        """Change the display order of categories or products"""
        pass

@restaurant_ns.route('/manage/status')
class ManageStatus(Resource):
    @restaurant_ns.doc('toggle_status')
    def post(self):
        """Toggle the open/closed status of the restaurant"""
        pass

@restaurant_ns.route('/manage/icon')
class ManageIcon(Resource):
    @restaurant_ns.expect(icon_model)
    @restaurant_ns.doc('update_icon')
    def post(self):
        """Update the restaurant's display icon URL"""
        pass


if __name__ == '__main__':
    port = int(os.environ.get('SWAGGER_PORT', 5001))
    print(f"Swagger UI is running at: http://127.0.0.1:{port}/swagger/")
    app.run(debug=True, port=port)
