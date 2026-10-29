# Security changes - 29 October 2026

Repository: Anshuman892494/CXC_Marketplace. Branch: main. Author: Aikansh.

## 1. Student administration permissions

Student-management access previously allowed changing administrative roles and
permissions, including assigning SUPER_ADMIN. It also allowed editing or deleting
staff accounts through the student endpoint. Administrative fields are now
read-only in that serializer, staff accounts are excluded from student management,
and super-admin permission requires an active staff account or superuser.

Validation: regression tests cover blocked role assignment, staff-only super-admin
access, inactive accounts, and the student endpoint's staff exclusion.
