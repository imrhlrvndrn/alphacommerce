const router = require('express').Router();
const authMiddleware = require('../middlewares');
const Users = require('../models/users.model');
const Wishlists = require('../models/wishlists.model');
const { CustomError } = require('../services');
const { mongooseSave, createWishlists } = require('../utils');
const { errorResponse, summation, successResponse } = require('../utils/errorHandlers');

router
    .route('/')
    .get(async (req, res, next) => {
        try {
            // ! req.auth will be injected by the auth middleware => authMiddleware
            // console.log('Request user: ', req.auth);
            // if (!req.auth) throw new CustomError('401', 'failed', 'Unauthorized: Access Denied');

            const returnedWishlists = await Wishlists.find({ user: req.cookies.userId }).select(
                req.params.select
            );
            if (!returnedWishlists.length)
                return next(CustomError.notFound(`Can't fetch any wishlists`));
            return successResponse(res, {
                status: 200,
                success: true,
                data: { wishlists: returnedWishlists.map((item) => item._doc) },
                toast: {
                    status: 'success',
                    message: 'Successfully fetched user wishlists',
                },
            });
        } catch (error) {
            console.log('Error => ', error);
            return next(errror);
        }
    })
    .post(async (req, res, next) => {
        const { wishlist, body, cookies } = req;
        try {
            const { type } = body;

            switch (type) {
                case 'FETCH_DETAILS': {
                    const { select, populate = '' } = body;
                    const returnedWishlists = await Wishlists.find({
                        user: cookies.userId,
                    })
                        .select(select || [])
                        .populate(populate);
                    if (!returnedWishlists.length)
                        return next(CustomError.notFound(`Can't fetch any wishlists`));

                    return successResponse(res, {
                        status: 200,
                        success: true,
                        data: { wishlists: returnedWishlists },
                        toast: {
                            status: 'success',
                            message: 'Fetched user wishlists',
                        },
                    });
                }

                case 'CREATE_WISHLIST': {
                    let savedWishlists = [];
                    const { wishlists } = body;

                    const newWishlists = wishlists.map(
                        ({ name, cover_image, user, data, estimated_price }) => ({
                            name: name || `Wishlist ${wishlist.length + 1}`,
                            cover_image: cover_image || { url: '' },
                            user: user,
                            data: data,
                            estimated_price:
                                estimated_price ||
                                data.reduce((acc, curVal) => acc + curVal.variants[2].price, 0) ||
                                0, // paperback variant
                        })
                    );

                    // Check if a wishlist with the same name exists already
                    // If yes, then check how many copies of this wishlist exists

                    // /*

                    wishlists.forEach(async (item) => {
                        let newWishlist = null;

                        const returnedUser = await Users.findOne({ _id: item.user });
                        if (!returnedUser)
                            return next(CustomError.notFound('No user found. Please login again'));

                        const wishlistExists = await Wishlists.findOne({
                            user: item.user,
                            'name.name': item.name.name,
                        });
                        if (wishlistExists) {
                            wishlistExists.name.duplicate_count += 1;
                            const savedWishlist = await wishlistExists.save();
                            if (!savedWishlist)
                                throw new CustomError(
                                    '500',
                                    'failed',
                                    "Couldn't update the original wishlist"
                                );

                            newWishlist = new Wishlists({
                                ...item,
                                name: {
                                    name: `${item.name.name} (${wishlistExists.name.duplicate_count})`,
                                    duplicate_count: 0,
                                },
                            });
                        } else {
                            newWishlist = new Wishlists(item);
                        }

                        returnedUser.wishlists = [...returnedUser.wishlists, newWishlist];
                        await returnedUser.save();
                        await newWishlist.save();
                        savedWishlists = [...savedWishlists, newWishlist];
                    });

                    console.log('Collection of all savedWishlists => ', savedWishlists);

                    return setTimeout(() => {
                        successResponse(res, {
                            status: 200,
                            success: true,
                            data: {
                                wishlists: savedWishlists,
                            },
                            toast: {
                                status: 'success',
                                message: 'Created new wishlist',
                            },
                        });
                    }, 3000);
                }

                case 'DELETE_WISHLIST':
                    const { wishlists } = body;

                    const returnedWishlists = [];

                    wishlists.forEach(async (item) => {
                        const removedWishlist = await Wishlists.findByIdAndRemove({
                            _id: item,
                        });
                        if (!removedWishlist)
                            return next(CustomError.notFound(`No such wishlist to delete`));

                        returnedWishlists.push(removedWishlist);
                    });

                    console.log('deleted wishlists => ', returnedWishlists);
                    return setTimeout(() => {
                        successResponse(res, {
                            status: 200,
                            success: true,
                            data: returnedWishlists,
                            toast: {
                                status: 'success',
                                message: 'Deleted wishlist',
                            },
                        });
                    }, 3000);

                default:
                    return next(CustomError.serverError('Invalid operation type'));
            }
        } catch (error) {
            console.error(error);
            return next(error);
        }
    });

router.param('wishlistId', async (req, res, next, wishlistId) => {
    const { select, populate } = req.body;
    try {
        console.log('wishlist id from router.param() middleware', wishlistId);
        const returnedWishlist = await Wishlists.findOne({ _id: wishlistId })
            .select(select || [])
            .populate(
                populate || {
                    path: 'data.book',
                }
            );
        if (!returnedWishlist) return next(CustomError.notFound('Wishlist not found!'));
        console.log('wishlist from routerParam()', returnedWishlist._doc.data);

        req.wishlist = returnedWishlist;
        next();
    } catch (error) {
        console.error(error);
        return next(error);
    }
});

router
    .route('/:wishlistId')
    .get(async (req, res, next) => {
        try {
            res.status(200).json({ success: true, data: { wishlist: req.wishlist } });
        } catch (error) {
            console.error(error);
            return next(error);
        }
    })
    .post(async (req, res, next) => {
        const { wishlist, body } = req;
        try {
            const { type } = body;

            switch (type) {
                case 'FETCH_DETAILS': {
                    return successResponse(res, {
                        success: true,
                        data: { wishlist: req.wishlist },
                        toast: {
                            status: 'success',
                            message: 'Fetched teh wishlist',
                        },
                    });
                }

                case 'ADD_TO_WISHLIST': {
                    const { wishlistItem } = body;

                    if (
                        wishlist.data.findIndex(
                            (item) => item.book._id.toString() === wishlistItem._id
                        ) !== -1
                    )
                        return next(
                            CustomError.alreadyExists(
                                `Already exists in (${wishlist.name.name}) wishlist`,
                                'warning'
                            )
                        );
                    else {
                        wishlist.data = [...wishlist.data, { book: wishlistItem }];
                    }

                    wishlist.estimated_price = wishlist.data.reduce(
                        (acc, cur) =>
                            acc +
                            cur.book.variants[
                                cur.book.variants.findIndex((item) => item.type === 'paperback')
                            ].price,
                        0
                    );

                    const savedWishlist = await wishlist.save();

                    return successResponse(res, {
                        success: true,
                        data: {
                            wishlist: wishlistItem,
                            estimated_price: savedWishlist._doc.estimated_price,
                        },
                        toast: {
                            status: 'success',
                            message: `Added to ${wishlist.name.name}`,
                        },
                    });
                }

                case 'REMOVE_FROM_WISHLIST': {
                    const { wishlistItem } = body;

                    if (
                        wishlist.data.findIndex(
                            (item) => item.book._id.toString() === wishlistItem._id
                        ) === -1
                    )
                        return next(
                            CustomError.notFound(`Item doesn't exist in (${wishlist.name.name})`)
                        );
                    else {
                        wishlist.data = wishlist.data.filter(
                            (item) => item.book._id.toString() !== wishlistItem._id
                        );
                    }

                    wishlist.estimated_price = wishlist.data.reduce(
                        (acc, cur) =>
                            acc +
                            cur.book.variants[
                                cur.book.variants.findIndex((item) => item.type === 'paperback')
                            ].price,
                        0
                    );

                    const savedWishlist = await wishlist.save();

                    // return setTimeout(() => {
                    successResponse(res, {
                        success: true,
                        data: {
                            estimated_price: savedWishlist._doc.estimated_price,
                            wishlistItem,
                        },
                        toast: {
                            status: 'success',
                            message: `Removed from ${wishlist.name.name}`,
                        },
                    });
                }

                default:
                    return next(CustomError.serverError(`Invalid operation type`));
            }
        } catch (error) {
            console.error(error);
            return next(error);
        }
    });

module.exports = router;
