export const getMe = (req, res) => {
    res.json({
        data: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
        },
    });
};
