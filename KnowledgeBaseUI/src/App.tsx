import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import GraphExplorer from './pages/GraphExplorer';
import TableView from './pages/TableView';
import QueryPage from './pages/QueryPage';

function App() {
	return (
		<BrowserRouter>
			<Toaster position="top-right" />
			<Layout>
				<Routes>
					<Route path="/" element={<Dashboard />} />
					<Route path="/graph" element={<GraphExplorer />} />
					<Route path="/table" element={<TableView />} />
					<Route path="/query" element={<QueryPage />} />
				</Routes>
			</Layout>
		</BrowserRouter>
	);
}

export default App;
