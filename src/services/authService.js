import { auth, firebaseConfig } from "./firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    getAuth, // Import getAuth
    updatePassword, // Import updatePassword
    EmailAuthProvider, // Import EmailAuthProvider
    reauthenticateWithCredential // Import reauthenticateWithCredential
} from "firebase/auth";
import { initializeApp } from "firebase/app";

export const login = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const register = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const subscribeToAuthChanges = (callback) => {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
};

// Create user using Firebase REST API to avoid session conflicts and SDK config issues
export const provisionUser = async (email, password) => {
    try {
        // Get API Key from config
        const apiKey = firebaseConfig.apiKey;

        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                returnSecureToken: true
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Erro ao criar usuário via API");
        }

        // Return user object compatible with what AdminDashboard expects
        return {
            success: true,
            user: {
                uid: data.localId,
                email: data.email
            }
        };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Update current user's password
export const updateUserPassword = async (newPassword) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado");

        await updatePassword(user, newPassword);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Re-authenticate user to verify identity
export const validateCurrentPassword = async (password) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado");

        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
