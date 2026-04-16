import { createContext } from "react";
import { auth } from "../../configs/firebase";


export interface User {
	id: string;
	personId: string;
	avatar?: string | null;
	userName: string;
	email: string;
	role: string;
	subRole: string;
	organizationId: string;
	status: string;
	isDeleted: boolean;
	lastLogin: string;
	loginMethod: string;
	createdAt: string;
	updatedAt: string;
	// Optional properties for backward compatibility
	name?: string;
	firstName?: string;
	lastName?: string;
	person: {
		personalInfo: {
			firstName: string;
			lastName: string;
			dateOfBirth: string;
			placeOfBirth: string;
			age: number;
			nationality: string;
			primaryLanguage: string;
			gender: string;
		};
		contactInfo: {
			email: string;
			phones: Array<{
				type: string;
				countryCode: string;
				number: string;
				isPrimary: boolean;
			}>;
			address: {
				street: string;
				city: string;
				state: string;
				country: string;
				postalCode: string;
				zipCode: string;
				houseNumber: string;
			};
		};
		identification: {
			type: string;
			number: string;
			issuingCountry: string;
			expiryDate: string;
		};
		metadata: {
			isActive: boolean;
			status: string | null;
			createdBy: string | null;
			updatedBy: string | null;
			lastLoginAt: string | null;
			isDeleted: boolean;
			createdAt?: string;
		};
		id: string;
	};
	organization: {
		branding: {
			logo: string;
			background: string;
			font: string;
			colors: {
				primary: string;
				secondary: string;
				accent: string;
				success: string;
				warning: string;
				danger: string;
				info: string;
				light: string;
				dark: string;
				neutral: string;
			};
		};
		id: string;
		name: string;
		code: string;
		description: string;
		createdAt: string;
		updatedAt: string;
	};
}

export interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	error: string | null;
	login: (email: string, password: string) => Promise<User>;
	logout: () => Promise<void>;
	getCurrentUser: () => Promise<void>;
	clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export default AuthContext;
