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
git clone https://github.com/yourusername/halal-formosa.git
cd halal-formosa
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Setup Environment
Create `.env` in the project root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 4️⃣ Run Development Server
```bash
npm run dev
```
Then visit: `http://localhost:5173`

### 5️⃣ Build for Production
```bash
npm run build
```

---

## 📦 Mobile App Build

To build the app for Android/iOS:

```bash
npm run build
npx cap sync
npx cap open android
# or
npx cap open ios
```

---

## 📝 Roadmap

- [ ] Ingredient auto-check for E-codes  
- [ ] Push notification for new product approval  
- [ ] Multi-language support (EN/ID/中文)  
- [ ] Offline product cache

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
