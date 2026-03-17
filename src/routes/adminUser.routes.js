const express = require('express');
const router = express.Router();

const {
    getAdminUsers,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
} = require('../controllers/adminUser.controller');

const { protect, allowRoles } = require('../middleware/auth.middleware');

router.use(protect, allowRoles("admin"));

router
    .route('/')
    .get(getAdminUsers)
    .post(createAdminUser);

router
    .route('/:id')
    .put(updateAdminUser)
    .delete(deleteAdminUser);

module.exports = router;