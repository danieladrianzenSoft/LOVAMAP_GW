import { createContext, useContext, useState, type ReactNode } from 'react';
import type { QueryResult } from '../models/rdfGraph';

export type SortDir = 'asc' | 'desc';

interface QueryState {
	question: string;
	sparql: string;
	result: QueryResult | null;
	error: string | null;
	sortField: string;
	sortDir: SortDir;
	sparqlOpen: boolean;
}

interface QueryStateContextValue extends QueryState {
	setQuestion: (v: string) => void;
	setSparql: (v: string) => void;
	setResult: (v: QueryResult | null) => void;
	setError: (v: string | null) => void;
	setSortField: (v: string) => void;
	setSortDir: (v: SortDir | ((prev: SortDir) => SortDir)) => void;
	setSparqlOpen: (v: boolean) => void;
}

const QueryStateContext = createContext<QueryStateContextValue | null>(null);

export function QueryStateProvider({ children }: { children: ReactNode }) {
	const [question, setQuestion] = useState('');
	const [sparql, setSparql] = useState('');
	const [result, setResult] = useState<QueryResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [sortField, setSortField] = useState('');
	const [sortDir, setSortDir] = useState<SortDir>('asc');
	const [sparqlOpen, setSparqlOpen] = useState(false);

	return (
		<QueryStateContext.Provider
			value={{
				question, setQuestion,
				sparql, setSparql,
				result, setResult,
				error, setError,
				sortField, setSortField,
				sortDir, setSortDir,
				sparqlOpen, setSparqlOpen,
			}}
		>
			{children}
		</QueryStateContext.Provider>
	);
}

export const useQueryState = () => {
	const ctx = useContext(QueryStateContext);
	if (!ctx) throw new Error('useQueryState must be used within QueryStateProvider');
	return ctx;
};
