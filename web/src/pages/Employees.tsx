import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PencilIcon, 
  TrashIcon, 
  UserIcon, 
  PlusIcon, 
  ArrowUturnLeftIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAppContext } from '~/shared/context/AppContext';
import { ConfirmDeleteModal } from '~/components/ConfirmDeleteModal';
import { EmployeeModal } from '~/components/EmployeeModal';
import { PermissionModal } from '~/components/PermissionModal';
import { employeesApi, permissionsApi } from '~/shared/api/employees';
import type { Employee, UserPermissionsDetail } from '~/shared/types/locations';
import { useApiError } from '~/shared/lib/useApiError';

type EmployeeWithPermissions = Employee & {
  allPermissions?: UserPermissionsDetail;
};

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { currentLocation } = useAppContext();
  const { getErrorMessage } = useApiError();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithPermissions | null>(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [managingPermissionsEmployee, setManagingPermissionsEmployee] = useState<EmployeeWithPermissions | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeWithPermissions | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for all employees (including inactive ones)
  const [allEmployees, setAllEmployees] = useState<EmployeeWithPermissions[]>([]);

  // Split employees into active and inactive
  const activeEmployees = allEmployees.filter(emp => emp.is_active);
  const inactiveEmployees = allEmployees.filter(emp => !emp.is_active);

  // Load employees when current location changes
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!currentLocation) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch active employees
        const active = await employeesApi.getBusinessEmployees(currentLocation.id, true);
        // Fetch inactive employees
        const inactive = await employeesApi.getBusinessEmployees(currentLocation.id, false);
        
        // Fetch detailed permissions for each employee
        const allEmployeesData = [...active, ...inactive];
        const employeesWithPermissions = await Promise.all(
          allEmployeesData.map(async (employee) => {
            try {
              const permissionsDetail = await permissionsApi.getUserPermissionsDetail(
                currentLocation.id,
                employee.user_id
              );
              return {
                ...employee,
                allPermissions: permissionsDetail,
              };
            } catch (err) {
              console.error(`Failed to fetch permissions for user ${employee.user_id}:`, err);
              return employee;
            }
          })
        );
        
        setAllEmployees(employeesWithPermissions);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, [currentLocation, getErrorMessage]);

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEditModalOpen(true);
  };

  const handleManagePermissions = (employee: Employee) => {
    setManagingPermissionsEmployee(employee);
    setIsPermissionsModalOpen(true);
  };

  const handleDeactivate = (employee: Employee) => {
    setDeletingEmployee(employee);
    setIsDeleteModalOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!deletingEmployee || !currentLocation) return;

    setIsDeleting(true);
    try {
      await employeesApi.deactivateEmployee(currentLocation.id, deletingEmployee.user_id);
      
      // Refresh employees list with permissions
      const active = await employeesApi.getBusinessEmployees(currentLocation.id, true);
      const inactive = await employeesApi.getBusinessEmployees(currentLocation.id, false);
      const allEmployeesData = [...active, ...inactive];
      
      const employeesWithPermissions = await Promise.all(
        allEmployeesData.map(async (employee) => {
          try {
            const permissionsDetail = await permissionsApi.getUserPermissionsDetail(
              currentLocation.id,
              employee.user_id
            );
            return {
              ...employee,
              allPermissions: permissionsDetail,
            };
          } catch (err) {
            console.error(`Failed to fetch permissions for user ${employee.user_id}:`, err);
            return employee;
          }
        })
      );
      
      setAllEmployees(employeesWithPermissions);
      setIsDeleteModalOpen(false);
      setDeletingEmployee(null);
    } catch (err) {
      console.error('Failed to deactivate employee:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateCancel = () => {
    setIsDeleteModalOpen(false);
    setDeletingEmployee(null);
  };

  const handleReactivate = async (employee: EmployeeWithPermissions) => {
    if (!currentLocation) return;

    try {
      await employeesApi.reactivateEmployee(currentLocation.id, employee.user_id);
      
      // Refresh employees list with permissions
      const active = await employeesApi.getBusinessEmployees(currentLocation.id, true);
      const inactive = await employeesApi.getBusinessEmployees(currentLocation.id, false);
      const allEmployeesData = [...active, ...inactive];
      
      const employeesWithPermissions = await Promise.all(
        allEmployeesData.map(async (emp) => {
          try {
            const permissionsDetail = await permissionsApi.getUserPermissionsDetail(
              currentLocation.id,
              emp.user_id
            );
            return {
              ...emp,
              allPermissions: permissionsDetail,
            };
          } catch (err) {
            console.error(`Failed to fetch permissions for user ${emp.user_id}:`, err);
            return emp;
          }
        })
      );
      
      setAllEmployees(employeesWithPermissions);
    } catch (err) {
      console.error('Failed to reactivate employee:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleModalSuccess = async () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    // setIsPermissionsModalOpen(false);
    setEditingEmployee(null);
    // setManagingPermissionsEmployee(null);

    // Refresh employees list with permissions
    if (currentLocation) {
      const active = await employeesApi.getBusinessEmployees(currentLocation.id, true);
      const inactive = await employeesApi.getBusinessEmployees(currentLocation.id, false);
      const allEmployeesData = [...active, ...inactive];
      
      const employeesWithPermissions = await Promise.all(
        allEmployeesData.map(async (employee) => {
          try {
            const permissionsDetail = await permissionsApi.getUserPermissionsDetail(
              currentLocation.id,
              employee.user_id
            );
            return {
              ...employee,
              allPermissions: permissionsDetail,
            };
          } catch (err) {
            console.error(`Failed to fetch permissions for user ${employee.user_id}:`, err);
            return employee;
          }
        })
      );
      
      setAllEmployees(employeesWithPermissions);
    }
  };

  if (!currentLocation) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('employees.noLocationSelected')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('employees.selectLocationFirst')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('employees.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('employees.description', { location: currentLocation.name })}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('employees.addEmployee')}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{t('common.error')}</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Active Employees Grid */}
      {activeEmployees.length === 0 ? (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('employees.noEmployees')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('employees.getStarted')}</p>
          <div className="mt-6">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('employees.addEmployee')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeEmployees.map((employee) => {
            // Get all permissions with has_permission=true
            const activePermissions = employee.allPermissions?.permissions.filter(p => p.has_permission) || [];
            
            return (
              <div
                key={employee.user_id}
                className="relative rounded-lg border border-gray-300 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-[380px]"
              >
                {/* Role Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    employee.role_in_business === 'manager' 
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {t(`employees.role.${employee.role_in_business}`)}
                  </span>
                </div>

                {/* Header - fixed */}
                <div className="flex items-start flex-shrink-0">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {employee.username}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">{employee.email}</p>
                  </div>
                </div>

                {/* Permissions - scrollable area */}
                <div className="mt-3 flex-1 overflow-y-auto min-h-0">
                  {activePermissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {activePermissions.map((permission) => (
                        <span
                          key={permission.permission_name}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            permission.source === 'role' 
                              ? 'bg-purple-100 text-purple-800'
                              : permission.source === 'user'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800' // both
                          }`}
                          title={
                            permission.source === 'role' 
                              ? t('permissions.badge.fromRole')
                              : permission.source === 'user'
                              ? t('permissions.badge.explicitlyGranted')
                              : t('permissions.badge.fromRole') + ' + ' + t('permissions.badge.explicitlyGranted')
                          }
                        >
                          {permission.permission_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">{t('permissions.noPermissions')}</p>
                  )}
                </div>

                {/* Joined Date - fixed */}
                <p className="text-xs text-gray-400 mt-2 flex-shrink-0">
                  {t('employees.joinedAt', { 
                    date: new Date(employee.joined_at).toLocaleDateString() 
                  })}
                </p>

                {/* Actions - fixed at bottom */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={() => handleManagePermissions(employee)}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    <ShieldCheckIcon className="h-4 w-4 mr-1" />
                    {t('employees.permissions')}
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title={t('employees.editEmployee')}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeactivate(employee)}
                      disabled={isDeleting}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title={t('employees.deactivateEmployee')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inactive Employees Section */}
      {inactiveEmployees.length > 0 && (
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('employees.inactiveEmployees')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('employees.inactiveEmployeesDescription')}</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {inactiveEmployees.map((employee) => (
              <div
                key={employee.user_id}
                className="relative rounded-lg border border-gray-200 bg-gray-50 p-6 shadow-sm opacity-75"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-700 truncate">
                      {employee.username}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">{employee.email}</p>
                  </div>
                </div>

                {/* Reactivate Action */}
                <div className="mt-6 flex items-center justify-end">
                  <button
                    onClick={() => handleReactivate(employee)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title={t('employees.reactivateEmployee')}
                  >
                    <ArrowUturnLeftIcon className="h-4 w-4 mr-1" />
                    {t('employees.reactivate')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      <EmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
        businessId={currentLocation.id}
      />

      {/* Edit Employee Modal */}
      <EmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleModalSuccess}
        businessId={currentLocation.id}
        employee={editingEmployee || undefined}
      />

      {/* Permissions Modal */}
      {managingPermissionsEmployee && (
        <PermissionModal
          isOpen={isPermissionsModalOpen}
          onClose={() => setIsPermissionsModalOpen(false)}
          onSuccess={handleModalSuccess}
          businessId={currentLocation.id}
          employee={managingPermissionsEmployee}
        />
      )}

      {/* Deactivate Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeactivateCancel}
        onConfirm={handleDeactivateConfirm}
        title={t('employees.deactivateEmployee')}
        message={t('employees.confirmDeactivateMessage')}
        itemName={deletingEmployee?.username}
        isDeleting={isDeleting}
      />
    </div>
  );
}
