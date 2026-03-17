const setAuthCookies = (res, accessToken, refreshToken) => {
    // access token – short-lived
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 15 * 60 * 1000, // 15  in ms
    });

    // refresh token – long-lived
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

const clearAuthCookies = (res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });
};

// const setAuthCookies = (res, accessToken, refreshToken) => {
//     const isTunnel = process.env.NODE_ENV !== "production"; // dev over tunnel
//     res.cookie("accessToken", accessToken, {
//         httpOnly: true,
//         secure: true,            // must be true for HTTPS (tunnel)
//         sameSite: "none",        // allows cross-site requests
//         maxAge: 15 * 60 * 1000,  // 15 minutes
//     });

//     res.cookie("refreshToken", refreshToken, {
//         httpOnly: true,
//         secure: true,            // must be true for HTTPS (tunnel)
//         sameSite: "none",
//         maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     });
// };

// const clearAuthCookies = (res) => {
//     res.clearCookie("accessToken", {
//         httpOnly: true,
//         secure: true,
//         sameSite: "none",
//     });
//     res.clearCookie("refreshToken", {
//         httpOnly: true,
//         secure: true,
//         sameSite: "none",
//     });
// };

module.exports = { setAuthCookies, clearAuthCookies };