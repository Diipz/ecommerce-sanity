"use client"

import { createCheckoutSession, Metadata } from "@/actions/createCheckoutSession";
import AddToBasketAtCheckout from "@/components/AddToBasketAtCheckout";
import Loader from "@/components/Loader";
import { imageUrl } from "@/lib/imageUrl";
import useBasketStore from "@/store/store"
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBasketStock } from "@/actions/getBasketStock";

interface ProductStock {
    _id: string;
    stock: number;
}

export default function BasketContents() {
    const groupedItems = useBasketStore((state) => state.getGroupedItems());
    const updateItemQuantity = useBasketStore((state) => state.updateItemQuantity);
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const router = useRouter();

    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [stockData, setStockData] = useState<ProductStock[]>([]);
    const [showDialog, setShowDialog] = useState(false);
    const [adjustedMessage, setAdjustedMessage] = useState<string[]>([]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Load stock data on component mount
    useEffect(() => {
        const validateStockOnLoad = async () => {
            const productIds = groupedItems.map((item) => item.product._id);
            const fetchedStockData = await getBasketStock(productIds);
            setStockData(fetchedStockData);

            const adjustedItems = fetchedStockData.filter((productStock: ProductStock) => {
                const basketItem = groupedItems.find(item => item.product._id === productStock._id);
                return basketItem && basketItem.quantity > productStock.stock;
            });

            // Adjust quantities and alert user if changes were made
            if (adjustedItems.length > 0) {
                adjustedItems.forEach((productStock: ProductStock) => {
                    updateItemQuantity(productStock._id, productStock.stock);
                });

                const adjustedMsgArray = adjustedItems.map((adjustedItem: ProductStock) => {
                    // Find the corresponding product in groupedItems to get the name
                    const product = groupedItems.find((item) => item.product._id === adjustedItem._id);
                    return `${product?.product.name || "Unknown"} (adjusted to ${adjustedItem.stock})`;
                });

                setAdjustedMessage(adjustedMsgArray);
                setShowDialog(true);
            }
        };

        validateStockOnLoad();
    }, [groupedItems, updateItemQuantity, router]);

    if (!isClient) {
        return <Loader />
    }


    if (groupedItems.length === 0) {
        return (
            <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Your Basket</h1>
                <p className="text-gray-600 text-lg">Your basket is empty</p>
            </div>
        )
    }

    const closeModal = () => {
        setShowDialog(false);
        router.replace("/basket"); // Refresh the basket page to update quantities
    };


    const handleCheckout = async () => {
        if (!isSignedIn) return;
        setIsLoading(true);

        try {
            const metadata: Metadata = {
                orderNumber: crypto.randomUUID(),
                customerName: user?.fullName ?? "Unknown",
                customerEmail: user?.emailAddresses[0].emailAddress ?? "Unknown",
                clerkUserId: user!.id
            };

            const checkoutUrl = await createCheckoutSession(groupedItems, metadata);

            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            }
        } catch (error) {
            console.error("Error creating checkout session", error);
        } finally {
            setIsLoading(false);
        }
    }

    // console.log("BASKET ITEMS", groupedItems);

    return (
        <div className="container mx-auto p-4 max-2-6xl">
            <h1 className="text-2xl font-bold mb-4">Your Basket</h1>
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-grow">
                    {groupedItems?.map((item) => {
                        const stockInfo = stockData.find(stockItem => stockItem._id === item.product._id);
                        const currentStock = stockInfo ? stockInfo.stock : item.product.stock;

                        return (
                            <div
                                key={item.product._id}
                                className="mb-4 p-4 border rounded flex items-center justify-between"
                            >
                                <div
                                    className="flex items-center cursor-pointer flex-1 min-w-0"
                                    onClick={() => router.push(`/product/${item.product.slug?.current}`)}
                                >
                                    <div className="w-20 h-20 sm:w-24 flex-shrink-0 mr-4">
                                        {item.product.image && (
                                            <Image
                                                src={imageUrl(item.product.image).url()}
                                                alt={item.product.name ?? "Product image"}
                                                className="w-full h-full object-cover rounded"
                                                width={96}
                                                height={96}
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg sm:text-xl font-semibold truncate">
                                            {item.product.name}
                                        </h2>
                                        <p className="text-sm sm:text-base">
                                            Price: £
                                            {((item.product.price ?? 0) * item.quantity).toFixed(2)}
                                        </p>
                                        {item.quantity === 0 && (
                                            <p className="text-sm text-red-500">
                                                Remove item before proceeding to checkout
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center ml-4 flex-shrink-0">
                                    <AddToBasketAtCheckout
                                        product={item.product}
                                        stock={currentStock as number}
                                        disabled={item.quantity >= currentStock!}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="w-full lg:w-80 lg:sticky lg:top-4 h-fit bg-white p-6 border rounded order-first lg:order-last fixed bottom-0 left-0 lg:left-auto">
                    <h3 className="text-xl font-semibold">Order Summary</h3>
                    <div className="mt-4 space-y-2">
                        <p className="flex justify-between">
                            <span>Items:</span>
                            <span>
                                {groupedItems.reduce((total, item) => total + item.quantity, 0)}
                            </span>
                        </p>
                        <p className="flex justify-between text-2xl font-bold border-t pt-2">
                            <span>Total:</span>
                            <span>
                                £{useBasketStore.getState().getTotalPrice().toFixed(2)}
                            </span>
                        </p>
                    </div>

                    {isSignedIn ? (
                        <button
                            onClick={handleCheckout}
                            disabled={isLoading || groupedItems.some(item => item.quantity === 0)}
                            className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                        >
                            {isLoading ? "Processing..." : "Checkout"}
                        </button>
                    ) : (
                        <SignInButton mode="modal">
                            <button className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                                Sign in to Checkout
                            </button>
                        </SignInButton>
                    )}
                </div>

                <div className="h-64 lg:h-0">
                    {/* Spacer for fixed checkout on mobile */}
                </div>
            </div>
            {showDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md z-50 flex items-center justify-center">
                    <dialog
                        open
                        className="bg-white p-6 rounded shadow-lg max-w-sm w-full z-100"
                    >
                        <p className="text-gray-800 text-lg mb-4">
                            Some items in your basket were adjusted due to limited stock:
                        </p>
                        <div className="space-y-2">
                            {adjustedMessage.map((message: string, index: number) => (
                                <p key={index} className="text-red-600">
                                    {message}
                                </p>
                            ))}
                        </div>
                        <form
                            method="dialog"
                            onSubmit={closeModal}
                            className="mt-4"
                        >
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
                                type="submit"
                            >
                                OK
                            </button>
                        </form>
                    </dialog>
                </div>
            )}
            s
        </div>
    );
}