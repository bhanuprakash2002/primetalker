// Country and State data for signup form dropdowns

export interface Country {
    code: string;
    name: string;
}

export interface State {
    code: string;
    name: string;
    countryCode: string;
}

// Major countries list
export const countries: Country[] = [
    { code: "IN", name: "India" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "JP", name: "Japan" },
    { code: "CN", name: "China" },
    { code: "BR", name: "Brazil" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "SG", name: "Singapore" },
    { code: "NL", name: "Netherlands" },
    { code: "IT", name: "Italy" },
    { code: "ES", name: "Spain" },
    { code: "MX", name: "Mexico" },
    { code: "ZA", name: "South Africa" },
    { code: "KR", name: "South Korea" },
    { code: "RU", name: "Russia" },
    { code: "SA", name: "Saudi Arabia" },
];

// Indian states
const indianStates: State[] = [
    { code: "AP", name: "Andhra Pradesh", countryCode: "IN" },
    { code: "AR", name: "Arunachal Pradesh", countryCode: "IN" },
    { code: "AS", name: "Assam", countryCode: "IN" },
    { code: "BR", name: "Bihar", countryCode: "IN" },
    { code: "CT", name: "Chhattisgarh", countryCode: "IN" },
    { code: "GA", name: "Goa", countryCode: "IN" },
    { code: "GJ", name: "Gujarat", countryCode: "IN" },
    { code: "HR", name: "Haryana", countryCode: "IN" },
    { code: "HP", name: "Himachal Pradesh", countryCode: "IN" },
    { code: "JH", name: "Jharkhand", countryCode: "IN" },
    { code: "KA", name: "Karnataka", countryCode: "IN" },
    { code: "KL", name: "Kerala", countryCode: "IN" },
    { code: "MP", name: "Madhya Pradesh", countryCode: "IN" },
    { code: "MH", name: "Maharashtra", countryCode: "IN" },
    { code: "MN", name: "Manipur", countryCode: "IN" },
    { code: "ML", name: "Meghalaya", countryCode: "IN" },
    { code: "MZ", name: "Mizoram", countryCode: "IN" },
    { code: "NL", name: "Nagaland", countryCode: "IN" },
    { code: "OR", name: "Odisha", countryCode: "IN" },
    { code: "PB", name: "Punjab", countryCode: "IN" },
    { code: "RJ", name: "Rajasthan", countryCode: "IN" },
    { code: "SK", name: "Sikkim", countryCode: "IN" },
    { code: "TN", name: "Tamil Nadu", countryCode: "IN" },
    { code: "TG", name: "Telangana", countryCode: "IN" },
    { code: "TR", name: "Tripura", countryCode: "IN" },
    { code: "UP", name: "Uttar Pradesh", countryCode: "IN" },
    { code: "UK", name: "Uttarakhand", countryCode: "IN" },
    { code: "WB", name: "West Bengal", countryCode: "IN" },
    { code: "DL", name: "Delhi", countryCode: "IN" },
];

// US states
const usStates: State[] = [
    { code: "AL", name: "Alabama", countryCode: "US" },
    { code: "AK", name: "Alaska", countryCode: "US" },
    { code: "AZ", name: "Arizona", countryCode: "US" },
    { code: "CA", name: "California", countryCode: "US" },
    { code: "CO", name: "Colorado", countryCode: "US" },
    { code: "FL", name: "Florida", countryCode: "US" },
    { code: "GA", name: "Georgia", countryCode: "US" },
    { code: "HI", name: "Hawaii", countryCode: "US" },
    { code: "IL", name: "Illinois", countryCode: "US" },
    { code: "NY", name: "New York", countryCode: "US" },
    { code: "TX", name: "Texas", countryCode: "US" },
    { code: "WA", name: "Washington", countryCode: "US" },
];

// UK regions
const ukRegions: State[] = [
    { code: "ENG", name: "England", countryCode: "GB" },
    { code: "SCT", name: "Scotland", countryCode: "GB" },
    { code: "WLS", name: "Wales", countryCode: "GB" },
    { code: "NIR", name: "Northern Ireland", countryCode: "GB" },
];

// Canadian provinces
const canadianProvinces: State[] = [
    { code: "ON", name: "Ontario", countryCode: "CA" },
    { code: "QC", name: "Quebec", countryCode: "CA" },
    { code: "BC", name: "British Columbia", countryCode: "CA" },
    { code: "AB", name: "Alberta", countryCode: "CA" },
];

// Australian states
const australianStates: State[] = [
    { code: "NSW", name: "New South Wales", countryCode: "AU" },
    { code: "VIC", name: "Victoria", countryCode: "AU" },
    { code: "QLD", name: "Queensland", countryCode: "AU" },
    { code: "WA", name: "Western Australia", countryCode: "AU" },
];

// Combine all states
export const states: State[] = [
    ...indianStates,
    ...usStates,
    ...ukRegions,
    ...canadianProvinces,
    ...australianStates,
];

// Helper function to get states by country code
export const getStatesByCountry = (countryCode: string): State[] => {
    return states.filter((state) => state.countryCode === countryCode);
};
