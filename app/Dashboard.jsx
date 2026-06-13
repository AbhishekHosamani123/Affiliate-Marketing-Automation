"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import styles from "./Dashboard.module.css"

export default function Dashboard({ onViewForm }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const fetchProducts = async () => {
        setLoading(true)
        setError("")
        try {
            const { data, error: fetchErr } = await supabase
                .from("products")
                .select("*")
                .order("created_at", { ascending: false })

            if (fetchErr) throw fetchErr
            setProducts(data || [])
        } catch (err) {
            console.error("Error fetching products:", err)
            setError(err.message || "Failed to load products")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProducts()
    }, [])

    const totalProducts = products.length
    const telegramCount = products.filter((p) => p.telegram_posted).length
    const instagramCount = products.filter((p) => p.instagram_posted).length
    const pinterestCount = products.filter((p) => p.pinterest_posted).length

    return (
        <div className={styles.page}>
            <div className={styles.shell}>
                <section className={styles.card}>
                    <header className={styles.header}>
                        <div className={styles.headerLeft}>
                            <p className={styles.kicker}>Analytics</p>
                            <h1 className={styles.title}>Marketing Dashboard</h1>
                            <p className={styles.subtitle}>Track your products and their sharing status across all platforms.</p>
                        </div>
                        <div className={styles.headerActions}>
                            <button onClick={fetchProducts} className={styles.headerNavButton}>
                                Refresh 🔄
                            </button>
                            <button onClick={onViewForm} className={styles.headerNavButtonPrimary}>
                                Add Product ➕
                            </button>
                        </div>
                    </header>

                    <div className={styles.content}>
                        {/* Stats Section */}
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <span className={styles.statEmoji}>🛍️</span>
                                <div className={styles.statInfo}>
                                    <p className={styles.statLabel}>Total Products</p>
                                    <h3 className={styles.statVal}>{totalProducts}</h3>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statEmoji}>✈️</span>
                                <div className={styles.statInfo}>
                                    <p className={styles.statLabel}>Telegram Posts</p>
                                    <h3 className={styles.statVal}>{telegramCount}</h3>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statEmoji}>📸</span>
                                <div className={styles.statInfo}>
                                    <p className={styles.statLabel}>Instagram Posts</p>
                                    <h3 className={styles.statVal}>{instagramCount}</h3>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statEmoji}>📌</span>
                                <div className={styles.statInfo}>
                                    <p className={styles.statLabel}>Pinterest Posts</p>
                                    <h3 className={styles.statVal}>{pinterestCount}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Error message if any */}
                        {error && <div className={styles.errorAlert}>{error}</div>}

                        {/* Products Table */}
                        {loading ? (
                            <div className={styles.loadingWrapper}>
                                <p className={styles.loadingText}>Fetching products from Supabase...</p>
                            </div>
                        ) : products.length === 0 ? (
                            <div className={styles.emptyWrapper}>
                                <p className={styles.emptyText}>No products found. Add your first product listing!</p>
                                <button onClick={onViewForm} className={styles.emptyButton}>
                                    Create First Product
                                </button>
                            </div>
                        ) : (
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Product Details</th>
                                            <th>Price</th>
                                            <th className={styles.centerCol}>Telegram</th>
                                            <th className={styles.centerCol}>Instagram</th>
                                            <th className={styles.centerCol}>Pinterest</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((product) => (
                                            <tr key={product.id}>
                                                <td>
                                                    <div className={styles.productCell}>
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.product_name}
                                                            className={styles.productImg}
                                                        />
                                                        <div className={styles.productMeta}>
                                                            <p className={styles.productName}>{product.product_name}</p>
                                                            {product.product_title && (
                                                                <p className={styles.productTitleAttr}>{product.product_title}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={styles.priceTag}>₹{product.price}</span>
                                                </td>
                                                <td className={styles.centerCol}>
                                                    <span className={product.telegram_posted ? styles.successMark : styles.failMark}>
                                                        {product.telegram_posted ? "✔️" : "❌"}
                                                    </span>
                                                </td>
                                                <td className={product.instagram_posted ? styles.successMark : styles.failMark}>
                                                    <span className={product.instagram_posted ? styles.successMark : styles.failMark}>
                                                        {product.instagram_posted ? "✔️" : "❌"}
                                                    </span>
                                                </td>
                                                <td className={product.pinterest_posted ? styles.successMark : styles.failMark}>
                                                    <span className={product.pinterest_posted ? styles.successMark : styles.failMark}>
                                                        {product.pinterest_posted ? "✔️" : "❌"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
