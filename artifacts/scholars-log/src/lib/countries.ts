export interface Country {
  name: string;
  city: string;
  flag: string;
  lat: number;
  lng: number;
}

export const COUNTRIES: Country[] = [
  { name: "Afghanistan", city: "Kabul", flag: "🇦🇫", lat: 34.5, lng: 69.2 },
  { name: "Albania", city: "Tirana", flag: "🇦🇱", lat: 41.3, lng: 19.8 },
  { name: "Algeria", city: "Algiers", flag: "🇩🇿", lat: 36.7, lng: 3.0 },
  { name: "Australia", city: "Sydney", flag: "🇦🇺", lat: -33.9, lng: 151.2 },
  { name: "Azerbaijan", city: "Baku", flag: "🇦🇿", lat: 40.4, lng: 49.9 },
  { name: "Bahrain", city: "Manama", flag: "🇧🇭", lat: 26.2, lng: 50.6 },
  { name: "Bangladesh", city: "Dhaka", flag: "🇧🇩", lat: 23.8, lng: 90.4 },
  { name: "Bosnia", city: "Sarajevo", flag: "🇧🇦", lat: 43.8, lng: 18.4 },
  { name: "Brazil", city: "Brasilia", flag: "🇧🇷", lat: -15.8, lng: -47.9 },
  { name: "Brunei", city: "Bandar Seri Begawan", flag: "🇧🇳", lat: 4.9, lng: 114.9 },
  { name: "Canada", city: "Toronto", flag: "🇨🇦", lat: 43.7, lng: -79.4 },
  { name: "China", city: "Beijing", flag: "🇨🇳", lat: 39.9, lng: 116.4 },
  { name: "Egypt", city: "Cairo", flag: "🇪🇬", lat: 30.0, lng: 31.2 },
  { name: "Ethiopia", city: "Addis Ababa", flag: "🇪🇹", lat: 9.0, lng: 38.7 },
  { name: "France", city: "Paris", flag: "🇫🇷", lat: 48.9, lng: 2.4 },
  { name: "Germany", city: "Berlin", flag: "🇩🇪", lat: 52.5, lng: 13.4 },
  { name: "Ghana", city: "Accra", flag: "🇬🇭", lat: 5.6, lng: -0.2 },
  { name: "India", city: "New Delhi", flag: "🇮🇳", lat: 28.6, lng: 77.2 },
  { name: "Indonesia", city: "Jakarta", flag: "🇮🇩", lat: -6.2, lng: 106.8 },
  { name: "Iran", city: "Tehran", flag: "🇮🇷", lat: 35.7, lng: 51.4 },
  { name: "Iraq", city: "Baghdad", flag: "🇮🇶", lat: 33.3, lng: 44.4 },
  { name: "Jordan", city: "Amman", flag: "🇯🇴", lat: 31.9, lng: 35.9 },
  { name: "Kazakhstan", city: "Astana", flag: "🇰🇿", lat: 51.2, lng: 71.4 },
  { name: "Kosovo", city: "Pristina", flag: "🇽🇰", lat: 42.7, lng: 21.2 },
  { name: "Kuwait", city: "Kuwait City", flag: "🇰🇼", lat: 29.4, lng: 47.9 },
  { name: "Kyrgyzstan", city: "Bishkek", flag: "🇰🇬", lat: 42.9, lng: 74.6 },
  { name: "Lebanon", city: "Beirut", flag: "🇱🇧", lat: 33.9, lng: 35.5 },
  { name: "Libya", city: "Tripoli", flag: "🇱🇾", lat: 32.9, lng: 13.2 },
  { name: "Malaysia", city: "Kuala Lumpur", flag: "🇲🇾", lat: 3.1, lng: 101.7 },
  { name: "Maldives", city: "Male", flag: "🇲🇻", lat: 4.2, lng: 73.5 },
  { name: "Mali", city: "Bamako", flag: "🇲🇱", lat: 12.6, lng: -8.0 },
  { name: "Mauritania", city: "Nouakchott", flag: "🇲🇷", lat: 18.1, lng: -15.9 },
  { name: "Morocco", city: "Rabat", flag: "🇲🇦", lat: 34.0, lng: -6.8 },
  { name: "Netherlands", city: "Amsterdam", flag: "🇳🇱", lat: 52.4, lng: 4.9 },
  { name: "Niger", city: "Niamey", flag: "🇳🇪", lat: 13.5, lng: 2.1 },
  { name: "Nigeria", city: "Abuja", flag: "🇳🇬", lat: 9.1, lng: 7.4 },
  { name: "Oman", city: "Muscat", flag: "🇴🇲", lat: 23.6, lng: 58.6 },
  { name: "Pakistan", city: "Islamabad", flag: "🇵🇰", lat: 33.7, lng: 73.0 },
  { name: "Palestine", city: "Ramallah", flag: "🇵🇸", lat: 31.9, lng: 35.2 },
  { name: "Qatar", city: "Doha", flag: "🇶🇦", lat: 25.3, lng: 51.5 },
  { name: "Saudi Arabia", city: "Riyadh", flag: "🇸🇦", lat: 24.7, lng: 46.7 },
  { name: "Senegal", city: "Dakar", flag: "🇸🇳", lat: 14.7, lng: -17.4 },
  { name: "Singapore", city: "Singapore", flag: "🇸🇬", lat: 1.3, lng: 103.8 },
  { name: "Somalia", city: "Mogadishu", flag: "🇸🇴", lat: 2.0, lng: 45.3 },
  { name: "South Africa", city: "Cape Town", flag: "🇿🇦", lat: -33.9, lng: 18.4 },
  { name: "Sudan", city: "Khartoum", flag: "🇸🇩", lat: 15.6, lng: 32.5 },
  { name: "Sweden", city: "Stockholm", flag: "🇸🇪", lat: 59.3, lng: 18.1 },
  { name: "Syria", city: "Damascus", flag: "🇸🇾", lat: 33.5, lng: 36.3 },
  { name: "Tajikistan", city: "Dushanbe", flag: "🇹🇯", lat: 38.6, lng: 68.8 },
  { name: "Tunisia", city: "Tunis", flag: "🇹🇳", lat: 36.8, lng: 10.2 },
  { name: "Turkey", city: "Istanbul", flag: "🇹🇷", lat: 41.0, lng: 28.9 },
  { name: "Turkmenistan", city: "Ashgabat", flag: "🇹🇲", lat: 37.9, lng: 58.4 },
  { name: "Uganda", city: "Kampala", flag: "🇺🇬", lat: 0.3, lng: 32.6 },
  { name: "United Arab Emirates", city: "Dubai", flag: "🇦🇪", lat: 25.2, lng: 55.3 },
  { name: "United Kingdom", city: "London", flag: "🇬🇧", lat: 51.5, lng: -0.1 },
  { name: "United States", city: "New York", flag: "🇺🇸", lat: 40.7, lng: -74.0 },
  { name: "Uzbekistan", city: "Tashkent", flag: "🇺🇿", lat: 41.3, lng: 69.2 },
  { name: "Yemen", city: "Sanaa", flag: "🇾🇪", lat: 15.4, lng: 44.2 },
];

export function getCountryByName(name: string): Country | undefined {
  return COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase());
}

export function getCityByCountry(countryName: string): string {
  return getCountryByName(countryName)?.city ?? "New York";
}
