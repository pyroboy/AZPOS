# /store MVP User Journey - Complete Flow Definition

## Entry: store-user-journey
**Timestamp:** 2025-07-28T10:03:00+08:00
**Task ID:** store-mvp-user-journey
**Type:** Final User Journey

### Content
---

# Customer-Facing /store MVP User Journey

## Executive Summary

This document defines the complete user journey for the AZPOS /store MVP, from initial product browsing through checkout confirmation. The journey is designed around the customer-facing data schema and API contracts, incorporating security best practices and comprehensive edge case handling.

## Core User Journey Flow

### 1. 🏪 Store Landing & Product Discovery

**Route:** `/store`
**User State:** Guest (no authentication required)
**API Calls:** `GET /store/api/products`

#### User Actions:
- **Browse Product Catalog**: Grid/list view of available products
- **Search Products**: Real-time search with debounced API calls
- **Filter by Category**: Category chips with instant filtering
- **Sort Products**: Price, name, popularity sorting options

#### Data Flow:
```typescript
// Initial page load
GET /store/api/products?page=1&limit=20&category=all&sort=name

// Search interaction
GET /store/api/products?search="bread"&page=1&limit=20

// Category filter
GET /store/api/products?category="dairy"&page=1&limit=20
```

#### UI Components:
- **ProductCard**: Shows `CustomerProduct` with sanitized data
- **SearchBar**: Debounced search with loading states
- **CategoryFilter**: Horizontal scrollable category chips
- **SortDropdown**: Price/name/popularity options

#### Edge Cases:
- **No Results**: Show "No products found" with search suggestions
- **Loading States**: Skeleton cards during API calls
- **Network Errors**: Retry mechanism with user feedback
- **Out of Stock**: Products shown with "Out of Stock" badge, add to cart disabled

---

### 2. 📱 Product Detail View

**Route:** `/store/product/[id]`
**User State:** Guest
**API Calls:** `GET /store/api/products/[id]`

#### User Actions:
- **View Product Details**: Full description, images, specifications
- **Select Modifiers**: Choose size, flavor, or other options (if available)
- **Adjust Quantity**: Quantity selector with validation
- **Add to Cart**: Primary action with immediate feedback

#### Data Flow:
```typescript
// Product detail load
GET /store/api/products/abc-123

// Add to cart action
POST /store/api/cart/add
Body: {
  product_id: "abc-123",
  quantity: 2,
  selected_modifiers: ["size-large", "flavor-vanilla"],
  notes: "Extra packaging please"
}
```

#### UI Components:
- **ProductGallery**: Image carousel with zoom
- **ModifierSelector**: Dynamic modifier groups based on product
- **QuantityInput**: Stepper with min/max validation
- **AddToCartButton**: Loading states and success animation

#### Edge Cases:
- **Stock Depletion**: Real-time stock check before add to cart
- **Invalid Modifiers**: Validation feedback for required selections
- **Quantity Limits**: Max 999 per item with validation message
- **Network Timeout**: Retry mechanism for add to cart action

---

### 3. 🛒 Cart Management

**Route:** `/store` (cart sidebar) or `/store/cart`
**User State:** Guest with session cart
**API Calls:** `GET /store/api/cart`, `PUT /store/api/cart/update`, `DELETE /store/api/cart/remove`

#### User Actions:
- **View Cart Items**: List of added products with details
- **Update Quantities**: Inline quantity editing
- **Remove Items**: Individual item removal
- **Apply Discounts**: Promo code entry and validation
- **View Cart Summary**: Subtotal, tax, discounts, total

#### Data Flow:
```typescript
// Cart load
GET /store/api/cart
Response: {
  items: CustomerCartItem[],
  summary: { subtotal, tax_amount, discount_amount, total_amount },
  available_discounts: CustomerDiscount[]
}

// Update quantity
PUT /store/api/cart/update
Body: { cart_item_id: "item-123", quantity: 3 }

// Remove item
DELETE /store/api/cart/remove
Body: { cart_item_id: "item-123" }
```

#### UI Components:
- **CartSidebar**: Slide-out panel with cart contents
- **CartItemCard**: Product info, quantity controls, remove button
- **CartSummary**: Breakdown of costs with discount application
- **DiscountInput**: Promo code entry with validation

#### Edge Cases:
- **Empty Cart**: Show empty state with "Continue Shopping" CTA
- **Stock Changes**: Real-time validation when items become unavailable
- **Invalid Discounts**: Clear error messaging for expired/invalid codes
- **Quantity Validation**: Prevent quantities exceeding stock or limits
- **Session Persistence**: Cart maintained across browser sessions

---

### 4. 💳 Checkout Process

**Route:** `/store/checkout`
**User State:** Guest with populated cart
**API Calls:** `POST /store/api/checkout`

#### User Actions:
- **Review Order**: Final cart review with item details
- **Enter Customer Info**: Optional name, email, phone
- **Select Payment Method**: Cash, credit card, debit card options
- **Add Special Instructions**: Optional delivery/preparation notes
- **Confirm Purchase**: Final confirmation with terms

#### Data Flow:
```typescript
// Checkout submission
POST /store/api/checkout
Body: {
  payment_method: "credit_card",
  applied_discounts: ["discount-123"],
  customer_info: {
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890"
  },
  special_instructions: "Please pack fragile items carefully"
}

Response: {
  success: true,
  transaction: CustomerTransaction,
  receipt_url: "https://...",
  message: "Order confirmed"
}
```

#### UI Components:
- **OrderReview**: Read-only cart summary
- **CustomerInfoForm**: Optional contact information
- **PaymentMethodSelector**: Radio buttons for payment options
- **SpecialInstructionsTextarea**: Optional notes field
- **ConfirmButton**: Final purchase confirmation

#### Edge Cases:
- **Stock Depletion During Checkout**: Real-time inventory check
- **Payment Processing Errors**: Clear error messaging and retry options
- **Network Interruption**: Transaction status verification
- **Invalid Customer Info**: Field-level validation with helpful messages
- **Discount Expiration**: Handle discounts that expire during checkout

---

### 5. ✅ Order Confirmation

**Route:** `/store/confirmation/[transaction_id]`
**User State:** Guest with completed transaction
**API Calls:** `GET /store/api/orders/[transaction_id]`

#### User Actions:
- **View Order Details**: Complete transaction summary
- **Download Receipt**: PDF or printable receipt
- **Continue Shopping**: Return to store catalog
- **Share Order**: Social sharing options (optional)

#### Data Flow:
```typescript
// Order confirmation load
GET /store/api/orders/txn-123
Response: {
  transaction: CustomerTransaction,
  receipt_url: "https://receipts.azpos.com/txn-123.pdf"
}
```

#### UI Components:
- **OrderSummary**: Complete transaction details
- **ReceiptDownload**: PDF generation and download
- **ContinueShoppingButton**: Return to store
- **OrderStatusIndicator**: Processing/confirmed status

#### Edge Cases:
- **Invalid Transaction ID**: 404 handling with helpful message
- **Receipt Generation Failure**: Fallback to HTML receipt
- **Order Processing Delays**: Status updates and estimated completion

---

## Critical Edge Cases & Error Handling

### 1. Stock Management Edge Cases

#### **Stock Depletion During Shopping**
- **Scenario**: Product becomes out of stock while in cart
- **Detection**: Real-time stock validation on cart load
- **User Experience**: 
  - Item marked as "No longer available"
  - Option to remove or find similar products
  - Cart total automatically recalculated

#### **Stock Depletion During Checkout**
- **Scenario**: Final stock check fails during checkout submission
- **Detection**: Server-side validation in checkout API
- **User Experience**:
  - Clear error message identifying unavailable items
  - Option to adjust quantities or remove items
  - Automatic return to cart for modifications

#### **Partial Stock Availability**
- **Scenario**: Requested quantity exceeds available stock
- **Detection**: Quantity validation against current stock
- **User Experience**:
  - Suggest maximum available quantity
  - Allow partial fulfillment with user confirmation
  - Clear messaging about stock limitations

### 2. Payment & Transaction Edge Cases

#### **Payment Processing Failure**
- **Scenario**: Payment gateway returns error
- **Detection**: Payment API response validation
- **User Experience**:
  - Clear error message with specific reason
  - Retry option with same payment method
  - Alternative payment method suggestions
  - Cart preservation during retry attempts

#### **Network Interruption During Checkout**
- **Scenario**: Connection lost during payment processing
- **Detection**: Network timeout and response validation
- **User Experience**:
  - Transaction status verification
  - Duplicate payment prevention
  - Clear communication about order status
  - Customer service contact information

#### **Session Expiration**
- **Scenario**: User session expires during checkout
- **Detection**: Session validation middleware
- **User Experience**:
  - Cart data preservation
  - Seamless session renewal
  - Minimal disruption to checkout flow

### 3. Data Validation Edge Cases

#### **Invalid Product Modifiers**
- **Scenario**: Selected modifiers become invalid
- **Detection**: Server-side modifier validation
- **User Experience**:
  - Clear validation messages
  - Automatic fallback to valid options
  - Preservation of other valid selections

#### **Discount Code Issues**
- **Scenario**: Discount expires or becomes invalid
- **Detection**: Real-time discount validation
- **User Experience**:
  - Immediate feedback on discount status
  - Automatic removal of invalid discounts
  - Suggestion of alternative discounts

### 4. Performance & Scalability Edge Cases

#### **High Traffic Scenarios**
- **Rate Limiting**: 10 requests per 60 seconds for cart operations
- **Graceful Degradation**: Fallback to cached data when possible
- **Queue Management**: Order processing queue during peak times

#### **Large Cart Scenarios**
- **Item Limits**: Maximum 50 unique items per cart
- **Quantity Limits**: Maximum 999 per item
- **Performance**: Pagination for large cart displays

---

## Security Considerations in User Journey

### 1. Input Validation
- **Client-Side**: Immediate feedback for user experience
- **Server-Side**: Authoritative validation using Zod schemas
- **Sanitization**: All user inputs sanitized before processing

### 2. Rate Limiting
- **Add to Cart**: 10 requests per 60 seconds per IP
- **Search**: 30 requests per 60 seconds per IP
- **Checkout**: 5 requests per 60 seconds per IP

### 3. Data Privacy
- **Customer Data**: Minimal collection, optional fields
- **Session Management**: Secure session handling
- **Data Sanitization**: Sensitive internal data excluded from responses

---

## Performance Optimization Strategy

### 1. Caching Strategy
- **Product Catalog**: Cache for 5 minutes
- **Category Data**: Cache for 30 minutes
- **Stock Levels**: Real-time, no caching
- **Cart Data**: Session-based storage

### 2. Pagination & Loading
- **Product Lists**: 20 items per page
- **Search Results**: 20 items per page
- **Order History**: 10 orders per page
- **Lazy Loading**: Product images loaded on demand

### 3. API Optimization
- **Debounced Search**: 300ms delay for search queries
- **Batch Operations**: Multiple cart updates in single request
- **Minimal Payloads**: Only necessary data in responses

---

## Implementation Priority

### Phase 1: Core Journey (Week 1)
1. Product catalog browsing
2. Basic cart functionality
3. Simple checkout process
4. Order confirmation

### Phase 2: Enhanced Features (Week 2)
1. Advanced search and filtering
2. Product modifiers
3. Discount system
4. Enhanced error handling

### Phase 3: Edge Cases & Polish (Week 3)
1. Comprehensive edge case handling
2. Performance optimizations
3. Security hardening
4. User experience refinements

### Phase 4: Advanced Features (Week 4)
1. Order history (optional)
2. Customer accounts (optional)
3. Advanced analytics
4. Mobile optimizations

---

**Implementation Notes:**
- All user journey steps integrate with the finalized customer-facing data schema
- Security principles from agent_researcher findings are incorporated throughout
- Edge case handling prioritizes user experience and data integrity
- Performance considerations ensure scalability for high-traffic scenarios
- The journey supports both guest checkout and optional customer accounts