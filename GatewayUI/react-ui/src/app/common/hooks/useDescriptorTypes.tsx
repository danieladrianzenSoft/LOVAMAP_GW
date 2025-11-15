import { useState, useEffect } from "react";
import { useStore } from "../../stores/store";
import { DescriptorType } from "../../models/descriptorType";

export const useDescriptorTypes = () => {
    const { descriptorStore } = useStore();
    const [descriptorTypes, setDescriptorTypes] = useState<DescriptorType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error,] = useState<string | null>(null);

    useEffect(() => {
		const fetchData = async () => {
			if (descriptorStore.descriptorTypes.length > 0) {
				setDescriptorTypes(descriptorStore.descriptorTypes);
				return;
			}
			setLoading(true);
			try {
				const data = await descriptorStore.getDescriptorTypes();
				setDescriptorTypes(data);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
		console.log(descriptorTypes);
	}, [descriptorStore]);

    return { descriptorTypes, loading, error };
};