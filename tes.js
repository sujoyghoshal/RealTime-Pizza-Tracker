require('dotenv').config(); // Load environment variables

const homeController = require('../app/http/controllers/homeController');
const authController = require('../app/http/controllers/authController');
const cartController = require('../app/http/controllers/customers/cartController');
const orderController = require('../app/http/controllers/customers/orderController');
const adminOrderController = require('../app/http/controllers/admin/orderController');
const statusController = require('../app/http/controllers/admin/statusController');
const menuSchema = require('../app/models/menu');
const mongoose = require('mongoose');
const nodemailer = require("nodemailer");

// Middlewares  
const guest = require('../app/http/middlewares/guest');
const auth = require('../app/http/middlewares/auth');
const admin = require('../app/http/middlewares/admin');

function initRoutes(app) {
    app.get('/', homeController().index);
    app.get('/login', guest, authController().login);
    app.post('/login', authController().postLogin);
    app.get('/register', guest, authController().register);
    app.post('/register', authController().postRegister);
    app.post('/logout', authController().logout);

    app.get('/cart', cartController().index);
    app.post('/update-cart', cartController().update);

    // Customer routes
    app.post('/orders', auth, orderController().store);
    app.get('/customer/orders', auth, orderController().index);

    app.get('/customer/orders/:id', auth, async (req, res) => {
        try {
            // Retrieve order details based on req.params.id
            const order = await Order.findById(req.params.id);
            if (!order) {
                return res.status(404).send("Order not found");
            }

            // Create transporter object using nodemailer
            const transporter = nodemailer.createTransport({
                service: "gmail",
                secure: true,
                port: 465,
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS
                }
            });

            // Prepare email options
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: req.user.email,
                subject: "Order Confirmation",
                text: `Hello ${req.user.name}, your order has been confirmed! Order ID: ${order._id}` // Modify the text as per your requirements
            };

            // Send the email
            const info = await transporter.sendMail(mailOptions);

            console.log("Email sent: " + info.response);

            // After sending email, render the order details page
            res.render('customer/order-details', { order: order });
        } catch (error) {
            console.error("Error sending email:", error);
            res.status(500).send("Error sending email");
        }
    });

    // Admin routes
    app.get('/admin/orders', admin, adminOrderController().index);
    app.post('/admin/order/status', admin, statusController().update);

    // All products
    app.get('/admin/all', (req, res) => {
        menuSchema.find().then((result) => {
            res.render('admin/allproduct', { data: result });
        }).catch((err) => {
            console.log(err);
        });
    });

    // Delete product
    app.get('/admin/delete/:id', (req, res) => {
        const idToDelete = req.params.id;
        menuSchema.findOneAndDelete({ _id: idToDelete })
            .then((result) => {
                if (!result) {
                    res.status(404).send("Product not found");
                } else {
                    res.redirect('/admin/all');
                }
            })
            .catch((error) => {
                console.error("Error deleting product:", error);
                res.status(500).send("Internal server error");
            });
    });

    // Add product
    app.get('/admin/add', (req, res) => {
        res.render('admin/addproduct');
    });

    app.post('/addproduct-submit', (req, res) => {
        const formData = {
            name: req.body.name,
            image: req.body.image,
            price: req.body.price,
            size: req.body.size
        };

        // Create a new document in the menuSchema collection
        menuSchema.create(formData)
            .then((newProduct) => {
                console.log("Product added:", newProduct);
                res.redirect('/admin/all');
            })
            .catch((error) => {
                console.error("Error adding product:", error);
                res.status(500).send("Internal server error");
            });
    });

    // Update product
    app.get('/admin/edit/:id', (req, res) => {
        const idToUpdate = req.params.id;
        menuSchema.findOne({ _id: idToUpdate })
            .then((result) => {
                if (!result) {
                    res.status(404).send("Product not found");
                } else {
                    res.render('admin/editpage', { data: result });
                }
            })
            .catch((error) => {
                console.error("Error fetching product for editing:", error);
                res.status(500).send("Internal server error");
            });
    });

    app.post("/edit-submit", (req, res) => {
        const { id, name, image, price, size } = req.body;

        menuSchema.updateOne({ "_id": mongoose.Types.ObjectId(id) }, { $set: { name, image, price, size } })
            .then(result => {
                res.redirect('/admin/all');
            })
            .catch(error => {
                console.error(error);
                res.status(500).send('Internal Server Error');
            });
    });

}

module.exports = initRoutes;
