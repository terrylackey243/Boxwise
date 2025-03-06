const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');

// @route   GET api/subscriptions
// @desc    Get subscription details
// @access  Private/Owner
router.get('/', protect, authorize('owner'), async (req, res) => {
  try {
    // Find subscription for the user's group
    const subscription = await Subscription.findOne({ group: req.user.group });
    
    if (!subscription) {
      // If no subscription exists, create a free subscription
      const newSubscription = new Subscription({
        group: req.user.group,
        plan: 'free',
        status: 'active',
        createdBy: req.user.id
      });
      
      await newSubscription.save();
      
      return res.json({
        success: true,
        data: newSubscription
      });
    }
    
    // Get the subscription plan details
    const plan = await SubscriptionPlan.findOne({ id: subscription.plan });
    
    res.json({
      success: true,
      data: {
        ...subscription.toObject(),
        planDetails: plan ? plan.toObject() : null
      }
    });
  } catch (err) {
    console.error('Error fetching subscription:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   PUT api/subscriptions
// @desc    Update subscription
// @access  Private/Owner
router.put('/', protect, authorize('owner'), async (req, res) => {
  try {
    const { billingDetails } = req.body;
    
    // Find subscription for the user's group
    let subscription = await Subscription.findOne({ group: req.user.group });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Update billing details
    if (billingDetails) {
      subscription.billingDetails = {
        ...subscription.billingDetails,
        ...billingDetails
      };
    }
    
    subscription.updatedBy = req.user.id;
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });
  } catch (err) {
    console.error('Error updating subscription:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   POST api/subscriptions/checkout
// @desc    Create checkout session for subscription
// @access  Private/Owner
router.post('/checkout', protect, authorize('owner'), async (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }
    
    // Find the plan
    const plan = await SubscriptionPlan.findOne({ id: planId, isActive: true });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found or inactive'
      });
    }
    
    // In a real implementation, this would create a checkout session with a payment provider
    // For now, we'll just return a success message
    
    res.json({
      success: true,
      message: 'Checkout session created',
      data: {
        checkoutUrl: `/checkout/${planId}`,
        plan: plan.toObject()
      }
    });
  } catch (err) {
    console.error('Error creating checkout session:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   GET api/subscriptions/plans
// @desc    Get available subscription plans
// @access  Private
router.get('/plans', protect, async (req, res) => {
  try {
    // Get all active plans
    const plans = await SubscriptionPlan.find({ isActive: true })
      .sort({ sortOrder: 1 });
    
    // If no plans exist in the database, create default plans
    if (plans.length === 0) {
      const defaultPlans = [
        {
          id: 'free',
          name: 'Free',
          description: 'Basic inventory management for small collections',
          price: 0,
          currency: 'USD',
          interval: 'month',
          features: ['Up to 50 items', '1 user', 'Basic features'],
          limits: {
            items: 50,
            users: 1,
            locations: 3
          },
          isActive: true,
          sortOrder: 0
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Advanced inventory management for growing collections',
          price: 9.99,
          currency: 'USD',
          interval: 'month',
          features: [
            'Unlimited items',
            'Up to 5 users',
            'Advanced reporting',
            'Custom categories',
            'Priority support'
          ],
          limits: {
            items: -1, // unlimited
            users: 5,
            locations: -1 // unlimited
          },
          isActive: true,
          sortOrder: 1
        },
        {
          id: 'business',
          name: 'Business',
          description: 'Complete inventory management for organizations',
          price: 19.99,
          currency: 'USD',
          interval: 'month',
          features: [
            'Unlimited items',
            'Unlimited users',
            'Advanced reporting',
            'Custom categories',
            'Priority support',
            'API access',
            'Dedicated account manager'
          ],
          limits: {
            items: -1, // unlimited
            users: -1, // unlimited
            locations: -1 // unlimited
          },
          isActive: true,
          sortOrder: 2
        }
      ];
      
      // Create the default plans
      await SubscriptionPlan.insertMany(defaultPlans);
      
      // Return the default plans
      return res.json({
        success: true,
        data: defaultPlans
      });
    }
    
    // Get the current subscription for the user's group
    const subscription = await Subscription.findOne({ group: req.user.group });
    const currentPlan = subscription ? subscription.plan : 'free';
    
    res.json({
      success: true,
      data: {
        plans,
        currentPlan
      }
    });
  } catch (err) {
    console.error('Error fetching subscription plans:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   POST api/subscriptions/cancel
// @desc    Cancel subscription
// @access  Private/Owner
router.post('/cancel', protect, authorize('owner'), async (req, res) => {
  try {
    // Find subscription for the user's group
    const subscription = await Subscription.findOne({ group: req.user.group });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // If subscription is already free, there's nothing to cancel
    if (subscription.plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Free subscriptions cannot be canceled'
      });
    }
    
    // Update subscription status
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    subscription.updatedBy = req.user.id;
    
    // In a real implementation, this would also cancel the subscription with the payment provider
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription
    });
  } catch (err) {
    console.error('Error canceling subscription:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   POST api/subscriptions/change-plan
// @desc    Change subscription plan
// @access  Private/Owner
router.post('/change-plan', protect, authorize('owner'), async (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }
    
    // Find the plan
    const plan = await SubscriptionPlan.findOne({ id: planId, isActive: true });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found or inactive'
      });
    }
    
    // Find subscription for the user's group
    let subscription = await Subscription.findOne({ group: req.user.group });
    
    if (!subscription) {
      // If no subscription exists, create a new one
      subscription = new Subscription({
        group: req.user.group,
        plan: planId,
        status: 'active',
        createdBy: req.user.id
      });
    } else {
      // Update existing subscription
      subscription.plan = planId;
      subscription.status = 'active';
      subscription.updatedBy = req.user.id;
      
      // If downgrading to free, clear payment provider details
      if (planId === 'free') {
        subscription.paymentProvider = null;
        subscription.paymentProviderId = null;
      }
    }
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Subscription plan changed successfully',
      data: {
        subscription,
        plan
      }
    });
  } catch (err) {
    console.error('Error changing subscription plan:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

module.exports = router;
