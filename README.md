# Reshef Card Archive

A static card archive for the European English release of Yu-Gi-Oh! Reshef of Destruction.

## Deploying to GitHub Pages

This repository is ready to deploy with GitHub Actions. The workflow at `.github/workflows/deploy.yml` packages the static site files into a GitHub Pages artifact and deploys them from `main`.

1. Create a GitHub repository for this project.
2. Add it as the local remote:

   ```sh
   git remote add origin git@github.com:YOUR_USERNAME/yugioh-gallery.git
   ```

3. Push the `main` branch:

   ```sh
   git push -u origin main
   ```

4. In GitHub, open the repository settings, go to **Pages**, and set **Build and deployment** to **GitHub Actions**.
5. After the workflow runs, the deployed URL will appear in the workflow summary and in the repository Pages settings.

The deployed site includes `index.html`, `styles.css`, `app.js`, `data.js`, and the `assets/` directory. The workflow also adds `.nojekyll` to the published artifact so GitHub Pages serves the static files directly.
