import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";

import ModalImage from "react-modal-image";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
	messageMedia: {
		objectFit: "cover",
		width: 250,
		height: "auto",
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
	}
}));

const ModalImageCors = ({ imageUrl }) => {
	const classes = useStyles();
	const [fetching, setFetching] = useState(true);
	const [blobUrl, setBlobUrl] = useState("");
	const [visible, setVisible] = useState(false);
	const containerRef = useRef(null);

	// Só busca a imagem quando entrar na viewport (lazy loading)
	useEffect(() => {
		if (!containerRef.current) return;
		const observer = new IntersectionObserver(
			([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
			{ rootMargin: "200px" }
		);
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!imageUrl || !visible) return;
		const fetchImage = async () => {
			const { data, headers } = await api.get(imageUrl, {
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(
				new Blob([data], { type: headers["content-type"] })
			);
			setBlobUrl(url);
			setFetching(false);
		};
		fetchImage();
	}, [imageUrl, visible]);

	return (
		<div ref={containerRef} style={{ minHeight: 60 }}>
			{visible && (
				<ModalImage
					className={classes.messageMedia}
					smallSrcSet={fetching ? imageUrl : blobUrl}
					medium={fetching ? imageUrl : blobUrl}
					large={fetching ? imageUrl : blobUrl}
					alt="image"
					showRotate={true}
				/>
			)}
		</div>
	);
};

export default ModalImageCors;
