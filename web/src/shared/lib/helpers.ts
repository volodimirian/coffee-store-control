export const hasToken = () => !!localStorage.getItem("access_token");

// Returns clean token without Bearer prefix (Bearer prefix is added in API client)
export const getToken = () => localStorage.getItem("access_token");

// Save token to localStorage (stores clean token without Bearer prefix)
export const saveToken = (token: string) => {
    localStorage.setItem("access_token", token);
};

// Get token with Bearer prefix for manual API calls
export const getBearerToken = () => {
    const token = getToken();
    return token ? `Bearer ${token}` : null;
};

export const logout = () => {
    // Clear all auth-related data from localStorage
    localStorage.removeItem("access_token");
    localStorage.removeItem("currentLocation");

    // Redirect to login page
    window.location.href = "/login";
}

// UI Settings helpers
export const getUIPreference = <T>(key: string, defaultValue: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch {
        return defaultValue;
    }
};

export const setUIPreference = (key: string, value: unknown) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to save UI preference:', error);
    }
};

// Specific UI preferences
export const getShowInactivePreference = () => getUIPreference('expenses-show-inactive', false);
export const setShowInactivePreference = (value: boolean) => setUIPreference('expenses-show-inactive', value);

