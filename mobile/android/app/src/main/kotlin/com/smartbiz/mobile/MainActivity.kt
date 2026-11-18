package com.smartbiz.mobile

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.content.Context
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.android.FlutterActivity
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "com.smartbiz.mobile/files"
    private var pendingResult: MethodChannel.Result? = null
    private var pendingSaveText: String? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "pickCsv" -> {
                    if (pendingResult != null) { result.error("busy", "A file request is already open", null); return@setMethodCallHandler }
                    pendingResult = result
                    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "text/*"
                    }
                    startActivityForResult(intent, 8101)
                }
                "saveCsv" -> {
                    if (pendingResult != null) { result.error("busy", "A file request is already open", null); return@setMethodCallHandler }
                    pendingResult = result
                    pendingSaveText = call.argument<String>("text") ?: ""
                    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "text/csv"
                        putExtra(Intent.EXTRA_TITLE, call.argument<String>("name") ?: "smartbiz-sales.csv")
                    }
                    startActivityForResult(intent, 8102)
                }
                "printReceipt" -> {
                    val html = call.argument<String>("html") ?: ""
                    try {
                        val webView = WebView(this)
                        webView.webViewClient = object : WebViewClient() {
                            override fun onPageFinished(view: WebView, url: String) {
                                try {
                                    val manager = getSystemService(Context.PRINT_SERVICE) as PrintManager
                                    manager.print("SmartBiz receipt", view.createPrintDocumentAdapter("SmartBiz receipt"), PrintAttributes.Builder().build())
                                    result.success(true)
                                } catch (error: Exception) {
                                    result.error("print", error.message ?: "Could not open the print dialog", null)
                                }
                            }
                        }
                        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
                    } catch (error: Exception) {
                        result.error("print", error.message ?: "Could not prepare the receipt", null)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    @Deprecated("Use Activity Result APIs")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 8101 && requestCode != 8102) return
        val result = pendingResult ?: return
        pendingResult = null
        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            pendingSaveText = null
            result.success(null)
            return
        }
        val uri: Uri = data.data!!
        try {
            if (requestCode == 8101) {
                val text = contentResolver.openInputStream(uri)?.use { input -> BufferedReader(InputStreamReader(input, Charsets.UTF_8)).readText() }
                result.success(text)
            } else {
                val text = pendingSaveText ?: ""
                contentResolver.openOutputStream(uri)?.use { output -> OutputStreamWriter(output, Charsets.UTF_8).use { it.write(text) } }
                result.success(true)
            }
        } catch (error: Exception) {
            result.error("file_io", error.message ?: "Could not access the selected file", null)
        } finally {
            pendingSaveText = null
        }
    }
}
