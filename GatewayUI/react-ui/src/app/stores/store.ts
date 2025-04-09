import { createContext, useContext } from "react";
import CommonStore from "./commonStore";
import UserStore from "./userStore";
import ResourceStore from "./resourceStore";
import ScaffoldGroupStore from "./scaffoldGroupStore";
import DomainStore from "./domainStore";
import JobStore from "./jobStore";

interface Store {
	commonStore: CommonStore,
	userStore: UserStore,
	resourceStore: ResourceStore,
	scaffoldGroupStore: ScaffoldGroupStore,
	domainStore: DomainStore,
	jobStore: JobStore
}

export const store: Store = {
	commonStore: new CommonStore(),
	userStore: new UserStore(),
	resourceStore: new ResourceStore(),
	scaffoldGroupStore: new ScaffoldGroupStore(),
	domainStore: new DomainStore(),
	jobStore: new JobStore(),
}

export const StoreContext = createContext(store);

export function useStore() {
	return useContext(StoreContext);
}