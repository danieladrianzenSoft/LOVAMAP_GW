import axios from 'axios';
import type {
	RdfGraph, RdfOntologySummary, QueryResult,
	Paper, Author, Journal, Material,
	Experiment, Outcome, FabricationMethod, GeometryProfile,
} from '../models/rdfGraph';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const graphApi = {
	getGraph: (limit?: number) =>
		api.get<RdfGraph>('/graph', { params: limit ? { limit } : {} }).then(r => r.data),
	getSummary: () =>
		api.get<RdfOntologySummary>('/graph/summary').then(r => r.data),
};

export const papersApi = {
	getAll: () => api.get<Paper[]>('/papers').then(r => r.data),
};

export const authorsApi = {
	getAll: () => api.get<Author[]>('/authors').then(r => r.data),
};

export const journalsApi = {
	getAll: () => api.get<Journal[]>('/journals').then(r => r.data),
};

export const materialsApi = {
	getAll: () => api.get<Material[]>('/materials').then(r => r.data),
};

export const experimentsApi = {
	getAll: () => api.get<Experiment[]>('/experiments').then(r => r.data),
};

export const outcomesApi = {
	getAll: () => api.get<Outcome[]>('/outcomes').then(r => r.data),
};

export const fabricationMethodsApi = {
	getAll: () => api.get<FabricationMethod[]>('/fabrication-methods').then(r => r.data),
};

export const geometryProfilesApi = {
	getAll: () => api.get<GeometryProfile[]>('/geometry-profiles').then(r => r.data),
};

export const queryApi = {
	ask: (question: string) =>
		api.post<QueryResult>('/query', { question }).then(r => r.data),
	runSparql: (sparql: string) =>
		api.post<QueryResult>('/query/sparql', { sparql }).then(r => r.data),
};
