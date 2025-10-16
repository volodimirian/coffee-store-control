# Coffee Control - Tasks & Roadmap

## 🎯 Current Sprint: Layout Redesign

### 📋 Layout Restructure Tasks

#### ✅ Completed

- [x] Rebrand from LatAm Crypto to Coffee Control
- [x] Setup English/Russian i18n
- [x] Basic authentication system
- [x] Clean up category components
- [x] Install Heroicons library
- [x] Create Sidebar component with collapsible functionality
- [x] Update Layout.tsx with new structure
- [x] Create new pages (Products, Orders, Analytics, Settings)
- [x] Add routing for new pages
- [x] Update translations for new menu items

#### 🔄 In Progress

- [ ] **Final Testing & Polish**
  - [ ] Test responsive behavior on different screen sizes
  - [ ] Test sidebar collapse/expand functionality
  - [ ] Test mobile sidebar overlay
  - [ ] Verify all navigation links work correctly

#### 📝 Todo - Layout Components

**🔧 Core Sidebar Features:**

- [x] Sidebar component (`/src/components/Sidebar.tsx`)
  - [x] Collapsible state management
  - [x] Icon + text layout
  - [x] Icon-only collapsed state
  - [x] Hover effects and active states
  - [x] Active menu item highlighting

**📱 Responsive Design:**

- [x] Mobile sidebar (overlay mode)
- [x] Desktop sidebar (push content mode)
- [x] Breakpoint handling
- [ ] Touch gestures for mobile (optional)

**🎨 UI/UX Improvements:**

- [x] Update Layout.tsx structure
  - [x] Move brand logo to sidebar
  - [x] Keep auth buttons in top-right
  - [x] Implement sidebar toggle button
  - [x] Adjust main content area padding

**🗂️ Menu Structure:**

- [x] Dashboard (home icon)
- [x] Account/Profile (user icon)
- [x] Products/Inventory (package icon)
- [x] Orders (shopping-cart icon)
- [x] Analytics (chart icon)
- [x] Settings (cog icon)

**⚙️ Technical Implementation:**

- [x] Use Heroicons for consistent icons
- [x] Local state for sidebar collapsed/expanded
- [x] Persist sidebar state in localStorage
- [x] Smooth CSS transitions
- [x] Proper z-index management

---

## 🎯 Next Sprint: Advanced Role & Permission System

### 🏢 Business Context

**Coffee Control** - система управления малым бизнесом для кофеен (coffee to go)

- Управление филиалами по разным адресам
- Система сотрудников с переназначением прав
- Иерархия ролей: Админ системы → Владелец бизнеса → Сотрудники

### 🔐 Role & Permission System Implementation

#### 📋 Phase 1: Core Permission System (Backend)

- [ ] **Database Schema Updates**

  - [ ] Create `permissions` table (id, name, description, resource, action)
  - [ ] Create `role_permissions` table (role_id, permission_id)
  - [ ] Create `user_permissions` table (user_id, permission_id) - for individual overrides
  - [ ] Update `users` table with business ownership fields
  - [ ] Create `businesses` table (id, name, owner_id, created_at)
  - [ ] Create `business_locations` table (id, business_id, address, name)
  - [ ] Create `user_business_access` table (user_id, business_id, role_id)

- [ ] **Permission Management System**

  - [ ] Define core permissions (CRUD for products, orders, users, etc.)
  - [ ] Implement permission checking middleware
  - [ ] Create permission assignment/revocation logic
  - [ ] Add business context to permissions (per-business permissions)

- [ ] **Role System Enhancement**
  - [ ] Extend existing roles: `admin`, `business_owner`, `employee`
  - [ ] Implement role hierarchy validation
  - [ ] Create role-based permission templates
  - [ ] Add role assignment/modification endpoints

#### 📋 Phase 2: Role Management (Backend API)

- [ ] **Admin-Level Operations** (System Admin only)

  - [ ] `/api/admin/users` - List all users across system
  - [ ] `/api/admin/businesses` - Manage all businesses
  - [ ] `/api/admin/roles/{userId}` - Assign admin role
  - [ ] `/api/admin/permissions` - Global permission management

- [ ] **Business Owner Operations**

  - [ ] `/api/business/employees` - Manage business employees
  - [ ] `/api/business/locations` - Manage business locations
  - [ ] `/api/business/roles` - Assign roles to employees
  - [ ] `/api/business/permissions` - Grant/revoke permissions
  - [ ] `/api/business/register-employee` - Register new employees

- [ ] **Permission Checking**
  - [ ] Implement `@require_permission` decorator
  - [ ] Add business context validation
  - [ ] Create permission inheritance logic
  - [ ] Add audit logging for permission changes

#### 📋 Phase 3: Authentication Flow Updates (Backend)

- [ ] **Registration System Changes**

  - [ ] Remove role tabs from registration UI
  - [ ] Default registration as `business_owner`
  - [ ] Add business information to registration
  - [ ] Implement employee invitation system

- [ ] **Login System Updates**
  - [ ] Add business context to login
  - [ ] Support multi-business access for users
  - [ ] Implement business switching
  - [ ] Add role display in user session

#### 📋 Phase 4: Frontend Implementation

- [ ] **Registration UI Updates**

  - [ ] Replace role tabs with business owner registration
  - [ ] Add business information form fields
  - [ ] Create business setup wizard
  - [ ] Add employee invitation interface

- [ ] **Role Management Interface**

  - [ ] Create employee management page
  - [ ] Add permission assignment interface
  - [ ] Create role selection dropdowns
  - [ ] Add business location management

- [ ] **User Experience Updates**
  - [ ] Add role indicator in UI
  - [ ] Implement permission-based menu visibility
  - [ ] Create business switching interface
  - [ ] Add permission denied messages

#### 📋 Phase 5: Business & Location Management

- [ ] **Business Management**

  - [ ] Business profile editing
  - [ ] Business settings and preferences
  - [ ] Multi-location management
  - [ ] Business analytics and reporting

- [ ] **Employee Management**
  - [ ] Employee onboarding workflow
  - [ ] Schedule management
  - [ ] Performance tracking
  - [ ] Employee-specific analytics

#### 🔑 Role Hierarchy & Permissions

**System Admin (`admin`)**

- Full system access across all businesses
- Can assign admin role to other users
- System-wide analytics and management
- Can create/delete businesses

**Business Owner (`business_owner`)**

- Full control over their business(es)
- Can register and manage employees
- Can assign roles and permissions to employees
- Manage business locations and settings
- Business analytics and reporting

**Employee (`employee`)**

- Access based on assigned permissions
- Can be assigned to specific locations
- Role-based functionality access
- Limited to assigned business context

#### 🎯 Default Permissions by Role

**Admin:** ALL_PERMISSIONS
**Business Owner:**

- MANAGE_BUSINESS, MANAGE_EMPLOYEES, MANAGE_LOCATIONS
- ASSIGN_ROLES, ASSIGN_PERMISSIONS
- VIEW_ANALYTICS, MANAGE_PRODUCTS, MANAGE_ORDERS

**Employee (Base):**

- VIEW_PRODUCTS, MANAGE_ORDERS (if assigned)
- Limited analytics access
- Location-specific access only

#### 🛠️ Technical Implementation Details

**Database Changes:**

```sql
-- New tables to implement
permissions (id, name, description, resource, action)
role_permissions (role_id, permission_id)
user_permissions (user_id, permission_id)
businesses (id, name, owner_id, created_at)
business_locations (id, business_id, address, name)
user_business_access (user_id, business_id, role_id)
```

**API Endpoints Structure:**

```
/api/auth/register (updated) - business owner registration only
/api/admin/* - admin-only endpoints
/api/business/* - business owner operations
/api/permissions/* - permission checking and management
/api/employees/* - employee management
```

**Frontend Changes:**

- Replace registration role tabs with business registration form
- Add role selector in admin/business owner interfaces
- Implement permission-based UI rendering
- Add business switching functionality

---

## 🚀 Future Features & Enhancements

### 🏪 Coffee Shop Management Features

- [ ] **Product Management**

  - [ ] Coffee beans catalog
  - [ ] Inventory tracking
  - [ ] Price management
  - [ ] Stock alerts

- [ ] **Order Management**

  - [ ] Customer orders
  - [ ] Order history
  - [ ] Status tracking
  - [ ] Payment integration

- [ ] **Analytics Dashboard**
  - [ ] Sales reports
  - [ ] Popular products
  - [ ] Revenue tracking
  - [ ] Customer insights

### 👥 User Management

- [ ] **Advanced Role & Permission System** (NEW PRIORITY)

  - [ ] Granular permission system with role inheritance
  - [ ] Business context permissions
  - [ ] Employee invitation and management
  - [ ] Multi-business access support
  - [ ] Permission audit trails

- [ ] **Enhanced Roles** (UPDATED)

  - [x] Basic role system (admin, business_owner, employee)
  - [ ] Role-based menu visibility
  - [ ] Permission-based feature access
  - [ ] Custom role creation (future)
  - [ ] Role templates for common positions

- [ ] **Profile Management**
  - [ ] User profiles with business context
  - [ ] Avatar upload
  - [ ] Business-specific preferences
  - [ ] Security settings
  - [ ] Employee profiles and details

### 🎨 UI/UX Improvements

- [ ] **Theme System**

  - [ ] Dark/Light mode
  - [ ] Coffee-themed color palette
  - [ ] Custom brand colors
  - [ ] Accessibility improvements

- [ ] **Advanced Components**
  - [ ] Data tables with sorting/filtering
  - [ ] Modal dialogs
  - [ ] Notification system
  - [ ] Loading states

### 🔧 Technical Improvements

- [ ] **Backend Enhancements**

  - [ ] API versioning
  - [ ] Rate limiting
  - [ ] Caching system
  - [ ] File upload handling

- [ ] **Frontend Architecture**
  - [ ] State management (Zustand/Redux)
  - [ ] Component library
  - [ ] Storybook setup
  - [ ] E2E testing

---

## 📋 Current Layout Structure

### Before (Current):

```
┌─────────────────────────────────────────────────────────────────────┐
│ Coffee Control  [Dashboard] [Account]     🇷🇺 RU ▼ | [Регистрация] [Войти] │
└─────────────────────────────────────────────────────────────────────┘
│                                                                     │
│                        Main Content Area                            │
│                                                                     │
```

### After (Target):

```
┌─────────────────────────────────────────────────────────────────────┐
│                                    🇷🇺 RU ▼ | [Регистрация] [Войти] │ ← Top bar
├──────┬──────────────────────────────────────────────────────────────┤
│ ☰    │                                                              │
│ 🏠   │                                                              │
│ 👤   │                 Main Content Area                            │ ← Sidebar + Content
│ 📦   │                                                              │
│ 📊   │                                                              │
│ ⚙️   │                                                              │
└──────┴──────────────────────────────────────────────────────────────┘

Expanded sidebar:
┌─────────────────────────────────────────────────────────────────────┐
│                                    🇷🇺 RU ▼ | [Регистрация] [Войти] │
├─────────────┬───────────────────────────────────────────────────────┤
│ ☰ Coffee    │                                                       │
│ 🏠 Dashboard│                                                       │
│ 👤 Account  │               Main Content Area                       │
│ 📦 Products │                                                       │
│ 📊 Analytics│                                                       │
│ ⚙️ Settings │                                                       │
└─────────────┴───────────────────────────────────────────────────────┘
```

---

## 🎯 Priority Order

### Current Sprint Completion

1. **High Priority** - Finish Layout Polish (Testing & Bug fixes)

### Next Sprint (Role & Permission System)

1. **Phase 1** - Database schema and core permission system (Backend)
2. **Phase 2** - Role management API endpoints (Backend)
3. **Phase 3** - Authentication flow updates (Backend)
4. **Phase 4** - Frontend role management interface
5. **Phase 5** - Business & location management features

### Future Development

- **Medium Priority** - Advanced business features (inventory, reporting)
- **Low Priority** - UI/UX enhancements and optimization

---

## 📝 Implementation Notes

### Database Migration Strategy

- Create new tables without breaking existing functionality
- Migrate existing users to business_owner role by default
- Preserve existing authentication while adding new permission layers

### Security Considerations

- All permission checks must validate business context
- Admin operations require explicit admin role verification
- Employee permissions limited to assigned business scope
- Audit all role and permission changes

### UI/UX Guidelines

- Progressive disclosure - show features based on permissions
- Clear role indicators throughout the interface
- Intuitive business switching for multi-business users
- Responsive permission error handling
