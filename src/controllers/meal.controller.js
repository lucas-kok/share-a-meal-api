const assert = require('assert');
const dbconnection = require('../../database/dbconnection');
const logger = require('../config/config').logger;
const controller = {
	validateMeal: (req, res, next) => {
		const meal = req.body;
		const {
			isActive,
			isVega,
			isVegan,
			isToTakeHome,
			dateTime,
			maxAmountOfParticipants,
			price,
			imageUrl,
			name,
			description,
			allergenes,
		} = meal;

		try {
			assert(typeof isActive === 'number', 'IsActive must be a number');
			assert(typeof isVega === 'number', 'IsVega must be a number');
			assert(typeof isVegan === 'number', 'IsVegan must be a number');
			assert(
				typeof isToTakeHome === 'number',
				'IsToTakeHome must be a number'
			);
			assert(typeof dateTime === 'string', 'DateTime must be a number');
			assert(
				typeof maxAmountOfParticipants === 'number',
				'MaxAmountOfParticipants must be a number'
			);
			assert(typeof price === 'number', 'Price must be a decimal');
			assert(typeof imageUrl === 'string', 'ImageUrl must be a string');
			assert(typeof name === 'string', 'Name must be a string');
			assert(
				typeof description === 'string',
				'Description must be a number'
			);
			assert(
				typeof allergenes === 'string',
				'Allergenes must be a strings'
			);

			// Validating after making sure the variables are of the right type
			// Values must be 0 or 1
			assert(isVega == 0 || isVega == 1, 'IsVega must be either 0 or 1');
			assert(
				isVegan == 0 || isVegan == 1,
				'IsVegan must be either 0 or 1'
			);
			assert(
				isToTakeHome == 0 || isToTakeHome == 1,
				'IsToTakeHome must be either 0 or 1'
			);
			assert(
				allergenes
					.replace('gluten', '')
					.replace('lactose', '')
					.replace('noten', '')
					.replace(',', '').length == 0,
				`Allergenes can only contain: 'Gluten', 'lactose' or 'noten'`
			);

			next();
		} catch (error) {
			const selectiveErrorInformation = {
				status: 400,
				message: error.message,
			};

			next(selectiveErrorInformation);
		}
	},

	// UC-301: Create a meal
	addMeal: (req, res) => {
		const meal = req.body;
		const {
			isActive,
			isVega,
			isVegan,
			isToTakeHome,
			dateTime,
			maxAmountOfParticipants,
			price,
			imageUrl,
			name,
			description,
			allergenes,
		} = meal;
		const cookId = req.userId;

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err; // Not connected!

			// Use the connection
			connection.query(
				`INSERT INTO meal (isActive, isVega, isVegan, isToTakeHome, dateTime, maxAmountOfParticipants, price, imageUrl, cookId, name, description, allergenes) VALUES (${isActive}, ${isVega}, ${isVegan}, ${isToTakeHome}, '${dateTime}', ${maxAmountOfParticipants}, ${price}, '${imageUrl}', ${cookId}, '${name}', '${description}', '${allergenes}');`,

				function (error, results, fields) {
					// When done with the connection, release it.
					connection.release();

					// Don't use the connection here, it has been returned to the pool.
					// Handle error after the release.
					if (error) {
						return res.status(409).json({
							status: 409,
							result: `Meal could not be created`,
							error: error,
						});
					}

					logger.debug('Meal succesfully created');

					// Retrieving the full user from the database
					connection.query(
						`SELECT * FROM meal ORDER BY createDate DESC LIMIT 1;`,
						function (error, results, fields) {
							// When done with the connection, release it
							connection.release();

							// Handle error after the release
							if (error) throw error;

							res.status(200).json({
								status: 200,
								result: results[0],
							});
						}
					);
				}
			);
		});
	},

	// UC-302: Update a meal
	updateMeal: (req, res) => {
		const mealId = req.params.id;
		const userIdFromRequest = req.userId;

		if (isNaN(mealId)) {
			logger.warn('Id must be a number');

			return res.status(401).json({
				status: 401,
				result: 'Id must be a number',
			});
		}

		const updatedMeal = req.body;
		const {
			isActive,
			isVega,
			isVegan,
			isToTakeHome,
			dateTime,
			maxAmountOfParticipants,
			price,
			imageUrl,
			name,
			description,
			allergenes,
		} = updatedMeal;

		logger.debug(`UpdateMeal called with Id: ${mealId}`);

		dbconnection.getConnection(function (err, connection) {
			connection.query(
				`SELECT cookId FROM meal WHERE id = ${mealId};`,
				function (error, results, field) {
					if (error) throw error;

					// Returning when no records are found
					if (results.length <= 0) {
						logger.debug(`Mela with id ${mealId} not found`);

						return res.status(404).json({
							status: 404,
							message: `Meal with Id: ${mealId} not found`,
						});
					}

					const cookId = results[0].cookId;

					if (userIdFromRequest != cookId) {
						logger.debug(
							`Meal with Id: ${mealId} does not belong to user with Id: ${userIdFromRequest}`
						);

						return res.status(403).json({
							status: 403,
							message: `Meal with Id: ${mealId} does not belong to user with Id: ${userIdFromRequest}`,
						});
					}

					connection.query(
						`UPDATE meal SET isActive = ${isActive}, isVega = ${isVega}, isVegan = ${isVegan}, isToTakeHome = ${isToTakeHome}, dateTime = '${dateTime}', maxAmountOfParticipants = ${maxAmountOfParticipants}, price = ${price}, imageUrl = '${imageUrl}', name = '${name}', description = '${description}', allergenes = '${allergenes}' WHERE id = ${mealId};`,

						function (error, results, fields) {
							// When done with the connection, release it.
							connection.release();

							// Don't use the connection here, it has been returned to the pool.
							// Handle error after the release.
							if (error) {
								return res.status(409).json({
									status: 409,
									messsage: `Meal could not be updated`,
									error: error,
								});
							}

							logger.debug('Meal succesfully updated');

							// Retrieving the full user from the database
							connection.query(
								`SELECT * FROM meal where id = ${mealId};`,
								function (error, results, fields) {
									// When done with the connection, release it
									connection.release();

									// Handle error after the release
									if (error) throw error;

									res.status(200).json({
										status: 200,
										result: results[0],
									});
								}
							);
						}
					);
				}
			);
		});
	},

	// UC-303: Request list of all meals
	getAllMeals: (req, res) => {
		logger.debug(`GetAllMeals called`);

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err; // Not connected!

			// Use the connection
			connection.query(
				'SELECT * FROM meal',
				function (error, results, fields) {
					// When done with the connection, release it.
					connection.release();

					// Handle error after the release.
					if (error) throw error;

					// Don't use the connection here, it has been returned to the pool.
					logger.debug(`#results: ${results.length}`);

					res.status(200).json({
						status: 200,
						result: results,
					});
				}
			);
		});
	},

	// UC-304: Request details of meal
	getMeal: (req, res) => {
		const mealId = req.params.id;

		if (isNaN(mealId)) {
			logger.warn('Id must be a number');

			return res.status(401).json({
				status: 401,
				result: 'Id must be a number',
			});
		}

		logger.debug(`GetMeal called with Id: ${mealId}`);

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err; // Not connected!

			// Use the connection
			connection.query(
				`SELECT * FROM meal where id = ${mealId};`,
				function (error, results, fields) {
					// When done with the connection, release it.
					connection.release();

					// Handle error after the release.
					if (error) throw error;

					// Don't use the connection here, it has been returned to the pool.
					if (results.length <= 0) {
						console.debug(`Meal with Id: ${mealId} not be found`);

						return res.status(404).json({
							status: 404,
							message: `Meal with Id: ${mealId} not found`,
						});
					}

					const meal = results[0];

					res.status(200).json({
						status: 200,
						result: meal,
					});
				}
			);
		});
	},

	// UC-305: Delete meal
	deleteMeal: (req, res) => {
		const mealId = req.params.id;
		const userId = req.userId;

		if (isNaN(mealId)) {
			logger.warn('Id must be a number');

			return res.status(401).json({
				status: 401,
				result: 'Id must be a number',
			});
		}

		logger.debug(`DeleteMeal called with Id: ${mealId}`);

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err; // Not connected!

			// Use the connection
			connection.query(
				`SELECT cookId FROM meal WHERE id = ${mealId};`,
				function (error, results, fields) {
					if (err) throw error;

					logger.debug(results);
					if (results.affectedRows == 0 || results.length == 0) {
						logger.debug(`Meal with Id: ${mealId} not found`);

						return res.status(404).json({
							status: 404,
							message: `Meal with Id: ${mealId} not found`,
						});
					}

					const cookId = results[0].cookId;

					if (userId != cookId) {
						logger.debug(`User is not the owner of this meal`);

						return res.status(403).json({
							status: 403,
							message: `User is not the owner of this meal`,
						});
					}

					connection.query(
						`DELETE FROM meal WHERE id = ${mealId}`,
						function (error, results, fields) {
							// When done with the connection, release it.
							connection.release();

							// Don't use the connection here, it has been returned to the pool.
							// Handle error after the release.
							if (error) throw error;

							logger.debug(
								`Meal with Id: ${mealId} has been deleted`
							);

							res.status(200).json({
								status: 200,
								message: `Meal with Id: ${mealId} has been deleted`,
							});
						}
					);
				}
			);
		});
	},

	// UC-401 & UC-402: Participate and Sign off for a meal
	manageParticipation: (req, res) => {
		const mealId = req.params.id;
		const userId = req.userId;

		let meal;
		let currentAmountOfParticipants = 0;

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err;

			// Retrieving the data of the selected meals
			connection.query(
				`SELECT * FROM meal WHERE id = ${mealId};`,
				function (error, results, fields) {
					if (error) throw error;

					// Returning if no records of the meal are found
					if (results.length <= 0) {
						connection.release();

						return res.status(404).json({
							status: 404,
							message: `Meal with Id: ${mealId} not found`,
						});
					}

					meal = results[0];

					// Retrieving the amount of participations for the selected meal
					connection.query(
						`SELECT * FROM meal_participants_user WHERE mealId = ${mealId};`,
						function (error, results, fields) {
							currentAmountOfParticipants = results.length;

							// Looking whether to insert or delete a participation
							connection.query(
								`SELECT * FROM meal_participants_user WHERE mealId = ${mealId} AND userId = ${userId};`,
								function (error, results, fields) {
									if (error) throw error;

									// No participating record found, so needs to be inserted
									if (results.length == 0) {
										// Returning when there are no spots left
										if (
											currentAmountOfParticipants >=
											meal.maxAmountOfParticipants
										) {
											connection.release();
											res.status(409).json({
												status: 409,
												message: `Maximum amount of participants has been reached`,
											});
										}

										// Inserting the participation to the given meal
										connection.query(
											`INSERT INTO meal_participants_user (mealId, userId) VALUES(${mealId}, ${userId});`,
											function (error, results, fields) {
												connection.release();

												if (error) throw error;

												currentAmountOfParticipants++;

												logger.debug(
													'User has sucessfully been participated'
												);

												res.status(200).json({
													status: 200,
													result: [
														{
															currentlyParticipating: true,
															currentAmountOfParticipants:
																currentAmountOfParticipants,
														},
													],
												});
											}
										);
									} else {
										// If records found, removing the participation
										connection.query(
											`DELETE FROM meal_participants_user WHERE mealId = ${mealId} AND userId = ${userId};`,
											function (error, results, fields) {
												connection.release();

												if (error) throw error;

												currentAmountOfParticipants--;

												logger.debug(
													'User participation has sucessfully been removed'
												);

												res.status(200).json({
													status: 200,
													result: [
														{
															currentlyParticipating: false,
															currentAmountOfParticipants:
																currentAmountOfParticipants,
														},
													],
												});
											}
										);
									}
								}
							);
						}
					);
				}
			);
		});
	},
};

module.exports = controller;
