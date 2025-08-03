# Halal Formosa

**Halal Formosa** is a mobile app designed to help Muslims in Taiwan easily check the halal status of products by scanning barcodes, explore halal restaurants, and find mosques.  
Built with **Vue 3**, **Ionic Vue**, **Capacitor**, and **Supabase**.

---

## 🌟 Features

- **Barcode Scanner**  
  Scan product barcodes to check halal status.

- **Dynamic Product Database**  
  Products are fetched from **Supabase** with real-time updates.

- **Halal Ingredient Check**  
  Displays product ingredients and flags potentially doubtful ones.

- **Mosque & Halal Restaurant Map**  
  Interactive map with your current location and nearby halal places.

- **Google OAuth Login**  
  Sign in with Google to submit new products.

- **User Contribution**  
  Submit new product info (with barcode and ingredients).

- **Offline Friendly (Capacitor)**  
  Works as a hybrid mobile app for Android and iOS.

---

## 🛠 Tech Stack

- **Frontend:** [Vue 3](https://vuejs.org/), [Ionic Vue](https://ionicframework.com/docs/vue)
- **Backend:** [Supabase](https://supabase.com/) (Database + Auth)
- **Mobile:** [Capacitor](https://capacitorjs.com/) for Android/iOS build
- **Map API:** Google Maps JavaScript API
- **Other Tools:**  
  - Vercel for web hosting (optional)  
  - PWA Elements for camera & file upload

---

## 🚀 Getting Started

Follow these steps to run Halal Formosa locally:

### 1️⃣ Clone Repository
```bash
git clone https://github.com/rakharamadhana/halal-project.git
cd halal-project
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Setup Environment
Create `.env` in the project root:
```env
VITE_SUPABASE_URL=supabase_url
VITE_SUPABASE_ANON_KEY=supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=google_maps_api_key
VITE_GOOGLE_TRANSLATION_API_KEY=google_translation_api_key
VITE_OCR_SPACE_API_KEY=ocr_space_api_key
```

### 4️⃣ Run Development Server
```bash
ionic serve
```
Then visit: `http://localhost:8100`

### 5️⃣ Build for Production
```bash
ionic build
```

---

## 📦 Mobile App Build

To build the app for Android/iOS:

```bash
ionic build

# android
ionic cap sync android
ionic cap open android

# or iOS
ionic cap sync ios
ionic cap open ios
```

---

## 📝 Roadmap

- [ ] Ingredients scanner
- [ ] Push notification  
- [ ] Multi-language support (EN/ID/中文)

---

## 🤝 Contributing

Contributions are welcome!  
Fork the repo, create a new branch, and submit a pull request.

---

## 📄 License

This project is licensed under the **MIT License**.  
Feel free to use and adapt for personal or community projects.

---

## 💡 Acknowledgements

- [Supabase](https://supabase.com/)
- [Ionic Framework](https://ionicframework.com/)
- [Vue.js](https://vuejs.org/)
- [Google Maps API](https://developers.google.com/maps)

---

> **Maintained by [R Creative](https://your-link-if-any.com)**  
> Dedicated to supporting the Muslim community in Taiwan 🇹🇼
