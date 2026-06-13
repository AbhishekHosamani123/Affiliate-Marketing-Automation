"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { postProduct } from "@/lib/apiService"
import styles from "./CreationForm.module.css"

export default function CreationForm({ onViewDashboard }) {
    const [view, setView] = useState("form")
    const [submitting, setSubmitting] = useState(false)
    const [copied, setCopied] = useState(false)
    const [statusMessage, setStatusMessage] = useState("")

    const [productTitle, setProductTitle] = useState("")
    const [productName, setProductName] = useState("")
    const [price, setPrice] = useState("")
    const [discount, setDiscount] = useState("")
    const [benefit, setBenefit] = useState("")
    const [affiliateLink, setAffiliateLink] = useState("")
    const [hashtags, setHashtags] = useState("")
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState("")
    const [submittedProduct, setSubmittedProduct] = useState(null)
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview)
        }
    }, [imagePreview])

    const resetForm = () => {
        setView("form")
        setCopied(false)
        setStatusMessage("")
        setProductTitle("")
        setProductName("")
        setPrice("")
        setDiscount("")
        setBenefit("")
        setAffiliateLink("")
        setHashtags("")
        setImageFile(null)
        setImagePreview("")
        setSubmittedProduct(null)
        setIsDragging(false)
    }

    const processImageFile = (file) => {
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.")
            return
        }

        if (imagePreview) URL.revokeObjectURL(imagePreview)
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const handleImageChange = (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        processImageFile(file)
    }

    const handleDrop = (event) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer?.files?.[0]
        if (file) {
            processImageFile(file)
        }
    }

    const handleRemoveImage = () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview)
        setImageFile(null)
        setImagePreview("")
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (
            !productTitle.trim() ||
            !productName.trim() ||
            !price.trim() ||
            !discount.trim() ||
            !benefit.trim() ||
            !affiliateLink.trim() ||
            !hashtags.trim() ||
            !imageFile
        ) {
            alert("Please fill in all product fields and upload an image.")
            return
        }

        setSubmitting(true)

        try {
            const fileExt = imageFile.name.split(".").pop() || "jpg"
            const fileName = `${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, imageFile)
            if (uploadError) throw uploadError

            const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(fileName)
            const imageUrl = publicData.publicUrl

            const { data: insertedProduct, error: insertError } = await supabase.from("products").insert([
                {
                    product_title: productTitle.trim(),
                    product_name: productName.trim(),
                    price: Number(price),
                    discount: discount.trim(),
                    benefit: benefit.trim(),
                    affiliate_link: affiliateLink.trim(),
                    image_url: imageUrl,
                    hashtags: hashtags.trim(),
                    caption: null,
                    instagram_enabled: true,
                    telegram_enabled: true,
                    pinterest_enabled: true,
                    telegram_posted: false,
                    instagram_posted: false,
                    pinterest_posted: false,
                },
            ]).select("id").single()

            if (insertError) throw insertError

            let telegramMessage = "Saved to Supabase."
            let generatedCaption = null
            let telegramData = null

            try {
                telegramData = await postProduct({
                    product_title: productTitle.trim(),
                    product_name: productName.trim(),
                    price: Number(price),
                    discount: discount.trim(),
                    benefit: benefit.trim(),
                    affiliate_link: affiliateLink.trim(),
                    hashtags: hashtags.trim(),
                    image_url: imageUrl,
                })

                generatedCaption = telegramData.caption || null
                telegramMessage = telegramData.message || "Saved to Supabase and posted to Telegram and Instagram."
            } catch (telegramError) {
                telegramMessage = `Saved to Supabase, but posting failed: ${telegramError.message || "Network error"}`
            }

            if (insertedProduct?.id) {
                const updateData = {}
                if (generatedCaption) {
                    updateData.caption = generatedCaption
                }
                if (telegramData) {
                    updateData.telegram_posted = !!telegramData.telegram?.ok
                    updateData.instagram_posted = !!telegramData.instagram?.ok
                }
                await supabase.from("products").update(updateData).eq("id", insertedProduct.id)
            }

            setSubmittedProduct({
                productTitle: productTitle.trim(),
                productName: productName.trim(),
                price: price.trim(),
                discount: discount.trim(),
                benefit: benefit.trim(),
                affiliateLink: affiliateLink.trim(),
                hashtags: hashtags.trim(),
                imageUrl,
                imageName: imageFile.name,
                imagePreview,
            })
            setStatusMessage(telegramMessage)
            setView("success")
        } catch (error) {
            console.error(error)
            alert(error.message || "Failed to save product")
        } finally {
            setSubmitting(false)
        }
    }

    const handleCopy = async () => {
        if (!submittedProduct) return

        try {
            await navigator.clipboard.writeText(submittedProduct.affiliateLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            alert("Unable to copy the affiliate link.")
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.shell}>
                {view === "form" && (
                    <section className={styles.card}>
                        <header className={styles.header}>
                            <div className={styles.headerLeft}>
                                <p className={styles.kicker}>Product entry</p>
                                <h1 className={styles.title}>Create Product Listing</h1>
                                <p className={styles.subtitle}>Enter product details to construct the template and post directly to Telegram and Instagram.</p>
                            </div>
                            <button type="button" onClick={onViewDashboard} className={styles.headerNavButton}>
                                View Dashboard 📊
                            </button>
                        </header>

                        <div className={styles.content}>
                            <div className={styles.notice}>
                                <p>Fill all fields below to generate the structured affiliate post and save to Supabase.</p>
                            </div>

                            <form onSubmit={handleSubmit} className={styles.form}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Product Title / Hook</label>
                                    <input
                                        type="text"
                                        value={productTitle}
                                        onChange={(event) => setProductTitle(event.target.value)}
                                        placeholder="🔥 HUGE PRICE DROP! or ✨ STUNNING NEW STYLE!"
                                        className={styles.input}
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Product Name</label>
                                    <input
                                        type="text"
                                        value={productName}
                                        onChange={(event) => setProductName(event.target.value)}
                                        placeholder="Ethnic Motifs Zari Art Silk Saree"
                                        className={styles.input}
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Price</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={price}
                                        onChange={(event) => setPrice(event.target.value)}
                                        placeholder="499"
                                        className={styles.input}
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Discount</label>
                                    <input
                                        type="text"
                                        value={discount}
                                        onChange={(event) => setDiscount(event.target.value)}
                                        placeholder="60% Off or Flat ₹200 off"
                                        className={styles.input}
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Short Benefit Sentence</label>
                                    <input
                                        type="text"
                                        value={benefit}
                                        onChange={(event) => setBenefit(event.target.value)}
                                        placeholder="Premium soft fabric with beautiful zari borders, perfect for weddings!"
                                        className={styles.input}
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Shop Link (Affiliate Link)</label>
                                    <input
                                        type="url"
                                        value={affiliateLink}
                                        onChange={(event) => setAffiliateLink(event.target.value)}
                                        placeholder="https://example.com/your-affiliate-link"
                                        className={styles.input}
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Hashtags</label>
                                    <input
                                        type="text"
                                        value={hashtags}
                                        onChange={(event) => setHashtags(event.target.value)}
                                        placeholder="#saree #fashiondeals #ethnicwear"
                                        className={styles.input}
                                        required
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Upload Product Image</label>
                                    <div className={styles.uploadBox}>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleImageChange} 
                                            onDragEnter={() => setIsDragging(true)}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={handleDrop}
                                            className={styles.uploadInput} 
                                            required 
                                        />

                                        {imagePreview ? (
                                            <div className={styles.previewRow}>
                                                <img src={imagePreview} alt="Product preview" className={styles.previewImage} />
                                                <div className={styles.previewMeta}>
                                                    <p className={styles.previewName}>{imageFile?.name}</p>
                                                    <p className={styles.previewText}>Image selected and ready to submit.</p>
                                                </div>
                                                <button type="button" onClick={handleRemoveImage} className={styles.removeButton}>
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={`${styles.dropzone} ${isDragging ? styles.dragging : ""}`}>
                                                <p className={styles.dropzoneTitle}>Click or Drag & Drop an image</p>
                                                <p className={styles.dropzoneHint}>PNG, JPG, WEBP, or other image formats</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" disabled={submitting} className={styles.submitButton}>
                                    {submitting ? "Saving product..." : "Save Product"}
                                </button>
                            </form>
                        </div>
                    </section>
                )}

                {view === "success" && submittedProduct && (
                    <section className={styles.successCard}>
                        <div className={styles.successBadge}>
                            Saved & Posted
                        </div>

                        <h2 className={styles.successTitle}>Product Captured</h2>
                        <p className={styles.successSubtitle}>Your product details were saved to Supabase and posted successfully.</p>
                        {statusMessage && <p className={styles.statusMessage}>{statusMessage}</p>}

                        <div className={styles.successGrid}>
                            <div className={styles.successImageWrap}>
                                <img src={submittedProduct.imagePreview} alt={submittedProduct.productName} className={styles.successImage} />
                            </div>

                            <div className={styles.successDetails}>
                                <div>
                                    <p className={styles.metaLabel}>Product Title / Hook</p>
                                    <p className={styles.metaValue}>{submittedProduct.productTitle}</p>
                                </div>

                                <div>
                                    <p className={styles.metaLabel}>Product Name</p>
                                    <p className={styles.metaValue}>{submittedProduct.productName}</p>
                                </div>

                                <div>
                                    <p className={styles.metaLabel}>Price</p>
                                    <p className={styles.priceValue}>₹{submittedProduct.price}</p>
                                </div>

                                <div>
                                    <p className={styles.metaLabel}>Discount</p>
                                    <p className={styles.metaValue}>{submittedProduct.discount}</p>
                                </div>

                                <div>
                                    <p className={styles.metaLabel}>Benefit Sentence</p>
                                    <p className={styles.metaValue}>{submittedProduct.benefit}</p>
                                </div>

                                <div>
                                    <p className={styles.metaLabel}>Hashtags</p>
                                    <p className={styles.metaValue}>{submittedProduct.hashtags}</p>
                                </div>

                                <div>
                                    <p className={styles.metaLabel}>Affiliate Link</p>
                                    <a href={submittedProduct.affiliateLink} target="_blank" rel="noreferrer" className={styles.linkText}>
                                        {submittedProduct.affiliateLink}
                                    </a>
                                </div>

                                <div>
                                    <p className={styles.metaLabel}>Image File</p>
                                    <p className={styles.metaValue}>{submittedProduct.imageName}</p>
                                </div>

                                <div className={styles.actionRow}>
                                    <button onClick={handleCopy} className={styles.copyButton}>
                                        {copied ? "Copied" : "Copy affiliate link"}
                                    </button>
                                    <a href={submittedProduct.affiliateLink} target="_blank" rel="noreferrer" className={styles.openButton}>
                                        Open link
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className={styles.footerActions} style={{ gap: "12px" }}>
                            <button onClick={resetForm} className={styles.secondaryButton}>
                                Add another product
                            </button>
                            <button onClick={onViewDashboard} className={styles.submitButton} style={{ boxShadow: "none" }}>
                                Go to Dashboard 📊
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
