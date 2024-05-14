const Order = require('../../../models/order');
const nodemailer = require('nodemailer');

function orderController() {
    return {
        index(req, res) {
            Order.find({ status: { $ne: 'completed' } }, null, { sort: { 'createdAt': -1 } })
                .populate('customerId', '-password')
                .exec((err, orders) => {
                    if (err) {
                        console.error('Error fetching orders:', err);
                        return res.status(500).json({ error: 'Internal server error' });
                    }

                    if (req.xhr) {
                        return res.json(orders);
                    } else {
                        return res.render('admin/orders', { orders });
                    }
                });
        },

        async markOrderAsCompleted(req, res) {
            const { orderId } = req.body;

            try {
                const updatedOrder = await Order.findByIdAndUpdate(orderId, { status: 'completed' }, { new: true });

                if (!updatedOrder) {
                    return res.status(404).json({ error: 'Order not found' });
                }

                // Send email notification
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'sujoyghoshal.s@gmail.com',
                        pass: 'cxsp uzwl foeb ftuz'
                    }
                });

                const receiver = {
                    from: 'sujoyghoshal.s@gmail.com',
                    to: 'sujoy1196.be21@chitkarauniversity.edu.in',
                    subject: 'Order Completed Notification',
                    text: `Order ${updatedOrder._id} has been completed.`
                };

                transporter.sendMail(receiver, (error, emailResponse) => {
                    if (error) {
                        console.error('Error sending email:', error);
                        return res.status(500).json({ error: 'Error sending email' });
                    } else {
                        console.log('Email sent:', emailResponse);
                        return res.status(200).json({ message: 'Order marked as completed', order: updatedOrder });
                    }
                });
            } catch (error) {
                console.error('Error marking order as completed:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        }
    };
}

module.exports = orderController;
