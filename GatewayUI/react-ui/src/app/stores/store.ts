import { createContext, useContext } from "react";
import CommonStore from "./commonStore";
import UserStore from "./userStore";
import ResourceStore from "./resourceStore";
import ScaffoldGroupStore from "./scaffoldGroupStore";

interface Store {
	commonStore: CommonStore,
	userStore: UserStore,
	resourceStore: ResourceStore,
	scaffoldGroupStore: ScaffoldGroupStore
}

export const store: Store = {
	commonStore: new CommonStore(),
	userStore: new UserStore(),
	resourceStore: new ResourceStore(),
	scaffoldGroupStore: new ScaffoldGroupStore()
}

export const StoreContext = createContext(store);

export function useStore() {
	return useContext(StoreContext);
}