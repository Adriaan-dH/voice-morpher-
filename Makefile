.PHONY: backend frontend

# Run the Flask backend
backend:
	python backend/app.py

# Run the Vite frontend  
frontend:
	cd frontend && npm run dev