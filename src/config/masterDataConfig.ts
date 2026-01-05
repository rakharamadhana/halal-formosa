export const masterDataConfig: Record<string, any> = {
    product_categories: {
        label: 'Product Categories',
        pk: 'id',
        fields: [
            { key: 'name', label: 'Name', type: 'text', required: true }
        ]
    },

    ingredient_highlights: {
        label: 'Ingredient Highlights',
        pk: 'id',
        fields: [
            {
                key: 'keyword',
                label: 'Keyword (EN)',
                type: 'text',
                required: true
            },
            {
                key: 'keyword_zh',
                label: 'Keyword (ZH)',
                type: 'text'
            },
            {
                key: 'color',
                label: 'Status',
                type: 'select',
                required: true,
                options: [
                    {
                        value: 'primary',
                        label: 'Muslim-friendly'
                    },
                    {
                        value: 'warning',
                        label: 'Syubhah'
                    },
                    {
                        value: 'danger',
                        label: 'Haram'
                    }
                ]
            }
        ]
    },

    location_types: {
        label: 'Location Types',
        pk: 'id',
        fields: [
            {
                key: 'name',
                label: 'Name',
                type: 'text',
                required: true
            },

            {
                key: 'emoji',
                label: 'Emoji',
                type: 'text',
                required: false
            },

            {
                key: 'color',
                label: 'Color (Hex)',
                type: 'text',
                required: false
            },

            {
                key: 'icon',
                label: 'Ionicon Key',
                type: 'text',
                required: false
            },
            {
                key: 'is_active',
                label: 'Active',
                type: 'select',
                options: [
                    { value: true, label: 'Active' },
                    { value: false, label: 'Inactive' }
                ]
            }

        ]
    },

    stores: {
        label: 'Stores',
        pk: 'id',
        fields: [
            { key: 'name', label: 'Store Name', type: 'text', required: true },
            { key: 'website', label: 'Website', type: 'url' },
            { key: 'logo_url', label: 'Logo URL', type: 'url' },
            { key: 'sort_order', label: 'Sort Order', type: 'number' }
        ]
    },

    category_rules: {
        label: 'Category Rules',
        pk: 'id',
        fields: [
            { key: 'keyword', label: 'Keyword', type: 'text', required: true },

            {
                key: 'category_id',
                label: 'Category',
                type: 'select',
                relation: {
                    table: 'product_categories',
                    value: 'id',
                    label: 'name'
                }
            }
        ]
    }
}
