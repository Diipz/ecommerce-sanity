"use server"

import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/live";

export const getBasketStock = async (productIds: string[]) => {
    const STOCK_QUERY = defineQuery(`
        *[
            _type == "product" 
            && _id in $productIds
        ] {
            _id,
            stock,
        }
    `);

    try {
        const products = await sanityFetch({
            query: STOCK_QUERY,
            params: { productIds },
        });

        return products.data || [];
    } catch (error) {
        console.error("Error fetching stock data:", error);
        return [];
    }
};