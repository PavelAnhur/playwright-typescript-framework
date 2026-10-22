# Checkout Flow

The user must be able to complete a purchase from the cart page.

## Steps the user performs

1. From the cart, click "Proceed to checkout".
2. Enter shipping address (name, street, city, postal code, country).
3. Choose a shipping method: standard (free, 5–7 days) or express (paid, 1–2 days).
4. Enter payment details (card number, expiry, CVC).
5. Review the order summary and click "Place order".

## Rules

- If the cart is empty, the checkout button must be disabled.
- Postal code format depends on the selected country.
- Express shipping must not be offered for items marked "standard-only".
- Payment must be rejected if the card is expired.
- After a successful order, the user is redirected to an order confirmation page with an order number.

## Not specified

- What happens if the payment provider times out.
- Whether the cart is preserved if the user abandons checkout.
- Whether an order can be cancelled after placing it.
