import { useState, useEffect } from "react";
import { useStore } from "../../stores/store";
import { DescriptorType } from "../../models/descriptorType";

export const useDescriptorTypes = () => {
    const { resourceStore } = useStore();
    const [descriptorTypes, setDescriptorTypes] = useState<DescriptorType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
		const fetchData = async () => {
			if (resourceStore.descriptorTypes.length > 0) {
				setDescriptorTypes(resourceStore.descriptorTypes);
				return;
			}
			setLoading(true);
			try {
				const data = await resourceStore.getDescriptorTypes();
				setDescriptorTypes(data);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [resourceStore]);

    return { descriptorTypes, loading, error };
};