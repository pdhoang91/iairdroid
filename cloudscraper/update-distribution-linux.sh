python -m PyInstaller --onefile --strip cs.py
mkdir distribution/linux
cp ./dist/cs ./distribution/linux/cs