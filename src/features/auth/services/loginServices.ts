const API_URL = import.meta.env.VITE_API_URL;

export const userLogin = async (username: string, password: string) => {
    const response = await fetch(`${API_URL}cuenta/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({userName: username, password})
    })

    if (!response.ok){
        const errorData = await response.json();
        throw new Error(errorData.error.message || "Error al enviar la solicitud")
    }

    return await response.json()
}