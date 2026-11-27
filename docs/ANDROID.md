# Android app (APK) and desktop install

GetItDone is an installable web app. The APK is a thin Android shell (a Trusted Web Activity)
around your live website, so you build it **after** deploying to an HTTPS address.

## Install without an APK

- Android and computers (Chrome or Edge): open the site and press **Install the app**.
- iPhone: Safari, Share, **Add to Home Screen**.

## Build the APK

Option A, no tools: open https://www.pwabuilder.com, enter your site address, choose Android,
and download the package. It includes the APK, the signing key and the fingerprint.

Option B, command line (it offers to download Java and the Android SDK):

    npm i -g @bubblewrap/cli
    mkdir getitdone-android && cd getitdone-android
    bubblewrap init --manifest https://YOUR-DOMAIN/manifest.webmanifest
    bubblewrap build

Use a package name such as `lk.getitdone.app`, and turn on location delegation if asked.

## Link the app to the website

1. Get the key's SHA-256 fingerprint: `keytool -list -v -keystore android.keystore`
2. Set these on your host and redeploy:

       ANDROID_PACKAGE_NAME=lk.getitdone.app
       ANDROID_CERT_SHA256=AB:CD:...

3. Check that `https://YOUR-DOMAIN/.well-known/assetlinks.json` lists them.
   Without this the app shows a browser address bar.

If you publish on Google Play with Play App Signing, add Google's signing fingerprint too
(comma separated).

## Keep it safe

- Back up the keystore and its password somewhere private. Losing it means you cannot update the app.
- Never put the keystore in Git or share it.
- Share the APK only from your own domain or Google Play.
