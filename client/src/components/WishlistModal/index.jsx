import axios from '../../axios';
import { useEffect, useRef, useState } from 'react';
import { maxWords } from '../../utils/math_helpers';
import { useAuth } from '../../context/AuthProvider';
import { useTheme } from '../../context/ThemeProvider';
import { useDataLayer } from '../../context/DataProvider';

// styles
import './wishlistmodal.scss';
import { withModalOverlay } from '../../hoc/withModalOverlay';
import { useModal } from '../../context/ModalProvider';

// * The items prop is an Array so that you can pass multiple items(books) for adding a whole list of items
// * For example => move an entire cart and create a wishlist out of it in one go
export const WishlistModal = ({ modal, dispatchType, items }) => {
    const { theme } = useTheme();
    const wishlistRef = useRef(null);
    const [{ currentUser }] = useAuth();
    const [_, modalDispatch] = useModal();
    const [filter, setFilter] = useState('');
    const [{ wishlists }, dataDispatch] = useDataLayer();
    const [newWishlistRef, setNewWishlistRef] = useState(false);

    const addNewWishlist = () => setNewWishlistRef((prevState) => !prevState);

    const addToWishlist = async (wishlistId) => {
        const {
            data: { success, data, toast },
        } = await axios.post(`/wishlists/${wishlistId}`, {
            wishlistItem: items[0],
            type: 'ADD_TO_WISHLIST',
        });

        console.log('API add to wishlist => ', data);

        if (success) {
            dataDispatch({
                type: 'ADD_TO_WISHLIST',
                payload: {
                    wishlistId: wishlistId,
                    data: [{ book: data.wishlist }],
                },
            });
        }

        modalDispatch({ type: 'UPDATE_WISHLIST_MODAL' });
    };

    const renderWishlistNames = (filter = '') => {
        // const userIndex = wishlists.findIndex((item) => item.userId === currentUser);
        const filteredWishlist =
            filter !== ''
                ? wishlists.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()))
                : wishlists;

        if (filteredWishlist.length === 0)
            return <p style={{ color: theme.color, padding: '1rem' }}>No wishlist</p>;

        return filteredWishlist.map((wishlistItem) => (
            <div
                className='wishlist-item'
                style={{ backgroundColor: theme.light_background }}
                onClick={() => addToWishlist(wishlistItem._id)}
            >
                {maxWords(wishlistItem.name.name, 30)}
            </div>
        ));
    };

    const createWishlist = async (event) => {
        try {
            setNewWishlistRef((prevState) => !prevState);
            if (!event.target.textContent) return;

            const {
                data: { success, data, toast },
            } = await axios.post(`/wishlists`, {
                type: 'CREATE_WISHLIST',
                wishlists: [
                    {
                        user: currentUser._id,
                        name: { name: event.target.textContent },
                        cover_image: {
                            url: 'https://images.pexels.com/photos/2685319/pexels-photo-2685319.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
                        },
                        estimated_price: 0,
                        data: [],
                    },
                ],
            });

            console.log('Created wishlist => ', data.wishlists);

            if (success) {
                dataDispatch({
                    type: 'CREATE_WISHLIST',
                    payload: data.wishlists,
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (newWishlistRef) wishlistRef.current.focus();
    }, [newWishlistRef]);

    return (
        <div className='wishlist-modal'>
            <div className='heading'>Add to wishlist</div>
            <div className='cta'>
                <input
                    type='text'
                    value={filter}
                    autoComplete='off'
                    id='wishlist-modal-input'
                    name='wishlist-modal-input'
                    placeholder='Search for wishlist...'
                    onChange={(event) => setFilter((prevState) => event.target.value)}
                    style={{ backgroundColor: theme.light_background, color: theme.color }}
                />
                <div
                    className='createNew'
                    onClick={addNewWishlist}
                    style={{ backgroundColor: theme.dark_background, color: theme.color }}
                >
                    + Create wishlist
                </div>
            </div>
            <div className='wishlist-modal-wrapper'>
                {newWishlistRef && (
                    <div
                        className='new-wishlist'
                        contentEditable
                        ref={wishlistRef}
                        onBlur={createWishlist}
                    ></div>
                )}
                {renderWishlistNames(filter)}
            </div>
        </div>
    );
};

const EnhancedWishlistModal = withModalOverlay(WishlistModal);
export { EnhancedWishlistModal };
