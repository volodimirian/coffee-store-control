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

- [ ] **Enhanced Roles**

  - [ ] Barista role
  - [ ] Manager role
  - [ ] Customer role enhancements
  - [ ] Permission system

- [ ] **Profile Management**
  - [ ] User profiles
  - [ ] Avatar upload
  - [ ] Preferences
  - [ ] Security settings

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

1. **High Priority** - Core Sidebar Implementation
2. **Medium Priority** - Responsive behavior and animations
3. **Low Priority** - Advanced features and enhancements

---

## 📝 Notes

- Use Tailwind CSS built-in icons or Heroicons library
- Maintain accessibility standards
- Ensure mobile-first responsive design
- Keep performance optimized
- Follow existing code patterns and conventions
