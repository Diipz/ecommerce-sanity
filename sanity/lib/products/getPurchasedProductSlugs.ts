import { defineQuery } from "next-sanity";
import { sanityFetch } from "../live";

export const getPurchasedProductSlugs = async (productIds: string[]) => {
    if (!productIds || productIds.length === 0) {
        console.warn("No product IDs provided for fetching slugs.");
        return [];
    }

    // Define a query to fetch products by their IDs and select only the slug field
    const PRODUCT_SLUGS_QUERY = defineQuery(`
        *[
            _type == "product" && _id in $productIds
        ] {
            "slug": slug.current
        }
    `);

    try {
        // Fetch product slugs from Sanity
        const result = await sanityFetch({
            query: PRODUCT_SLUGS_QUERY,
            params: { productIds }
        });

        // Map the results to extract only the slug strings
        const slugs = result.data.map((product: { slug: string | null }) => product.slug);

        return slugs;
    } catch (error) {
        console.error("Error fetching product slugs:", error);
        return [];
    }
};