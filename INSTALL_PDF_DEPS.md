# Installing PDF Generation Dependencies

To enable PDF generation, you need to install `weasyprint` and `markdown`.

## For Conda Environment

```bash
conda activate haven
cd backend
pip install weasyprint==62.3 markdown==3.7
```

## Note on macOS

WeasyPrint requires some system libraries. If installation fails, you may need:

```bash
# Install system dependencies (macOS)
brew install cairo pango gdk-pixbuf libffi

# Then install Python packages
pip install weasyprint markdown
```

## Alternative: Use Markdown Only

If PDF generation isn't needed, the server will work fine without `weasyprint`. 
Markdown downloads will still work.

