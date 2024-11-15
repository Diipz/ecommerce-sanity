import { defineQuery } from "next-sanity";
import { sanityFetch } from "../live";

export const getProductById = async (id: string) => {
    const PRODUCT_BY_ID_QUERY = defineQuery(`
        *[_type == "product" && _id == $id][0] {
            _id,
            name,
            price,
            stock,
            image,
            slug
        }
    `);

    try {
        // Use sanityFetch to send the query with the product ID as a parameter
        const product = await sanityFetch({
            query: PRODUCT_BY_ID_QUERY,
            params: {
                id,
            }
        });

        // Return the product data or null if not found
        return product.data || null;
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        return null;
    }
};