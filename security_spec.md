# Firestore Security Specification

## Data Invariants
- Each enterprise document must have a unique ID.
- License keys (masterKeys) can only be used once.
- Staff, Products, Tables, and Orders must belong to exactly one enterpriseId.
- Access to enterprise-scoped data is only allowed if the user's session enterprise matches the document's enterpriseId.

## The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Unauthorized Global Read**: Attempt to read `masterKeys` collection without being a registered developer/admin.
2. **License Key Hijack**: Attempt to use a `masterKey` that is already marked as `used: true`.
3. **Enterprise Data Leak**: User in `enterprise-A` tries to read `orders` from `enterprise-B`.
4. **Identity Spoofing**: Attempt to create a `staff` member with a different `enterpriseId` than the one provided in the session.
5. **State Shortcut**: Attept to update an `Order` status direct to `delivered` bypassing `preparing`.
6. **Price Manipulation**: Customer (if public) or Low-role staff member trying to change the price of a product during order creation.
7. **Phantom Shop Creation**: Creating a `Shop` without a valid `enterpriseId`.
8. **Owner Privilege Escalation**: A staff member with 'waiter' role trying to update shop settings.
9. **Negative Inventory**: Updating `inventory` currentStock to a negative value.
10. **Orphaned Order**: Creating an `Order` for a `tableId` that doesn't exist in that shop.
11. **Shadow Field Injection**: Adding `isAdmin: true` to a staff profile.
12. **System Field Overwrite**: Attempting to change `createdAt` on an existing document.

## Security Rules Strategy
- Implementation of `isValidId` and size constraints for all strings.
- Relational validation using `enterpriseId` from the request.
- Role-based access control (RBAC) checks for sensitive collections (shops, settings, masterKeys).
- Mandatory `enterpriseId` filtering enforced in simple queries.
