const assert = require('assert');
const dbconnection = require('../../database/dbconnection');
const logger = require('../config/config').logger;
const controller = {
	validateUser: (req, res, next) => {
		const user = req.body;
		const {
			firstName,
			lastName,
			emailAdress,
			password,
			phoneNumber,
			street,
			city,
		} = user;

		try {
			assert(
				typeof firstName === 'string',
				'First name must be a string'
			);
			assert(typeof lastName === 'string', 'Last name must be a string');
			assert(typeof emailAdress === 'string', 'Email must be a string');
			assert(typeof password === 'string', 'Password must be a string');
			assert(
				typeof phoneNumber === 'string',
				'Phone number must be a string'
			);
			assert(typeof street === 'string', 'Street must be a string');
			assert(typeof city === 'string', 'City must be a string');

			// Validating after making sure the email and password are strings
			// EmailAdress must be valid (found this regex online, not aware of all details)
			assert.match(
				emailAdress,
				/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
				'The emailAdress is not valid'
			);

			// Password contains 8-15 characters which contains at least one lower- and uppercase letter, one special character and one digit
			assert.match(
				password,
				/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/,
				'Password must contain 8-15 characters which contains at least one lower- and uppercase letter, one special character and one digit'
			);

			next();
		} catch (error) {
			const selectiveErrorInformation = {
				status: 400,
				result: error.message,
			};

			next(selectiveErrorInformation);
		}
	},

	// UC-201: Register a new user
	addUser: (req, res) => {
		const user = req.body;
		const {
			firstName,
			lastName,
			emailAdress,
			password,
			phoneNumber,
			street,
			city,
		} = user;

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err; // Not connected!

			// Use the connection
			connection.query(
				`INSERT INTO user (firstName, lastName, emailAdress, password, phoneNumber, street, city) VALUES ('${firstName}', '${lastName}', '${emailAdress}', '${password}', '${phoneNumber}', '${street}', '${city}');`,

				function (error, results, fields) {
					// When done with the connection, release it.
					connection.release();

					// Don't use the connection here, it has been returned to the pool.
					// Handle error after the release.
					if (error) {
						return res.status(409).json({
							status: 409,
							result: `User could not be added, emailAdress is already taken`,
						});
					}

					logger.debug('User succesfully created');

					res.status(200).json({
						status: 200,
						result: user,
					});
				}
			);
		});
	},

	// UC-202: Get all users
	getAllUsers: (req, res) => {
		const queryParams = req.query;
		const { firstName, isActive } = queryParams;

		logger.debug(
			`GetAllUsers called, firstName: ${firstName} & isActivte: ${isActive}`
		);

		let queryString = 'SELECT * FROM user';
		if (firstName || isActive) {
			queryString += ' WHERE ';

			if (firstName) {
				queryString += `firstName LIKE '${firstName}'`;

				if (isActive) {
					queryString += ' AND ';
				}
			}

			if (isActive) {
				queryString += `isActive = ${isActive}`;
			}
		}
		queryString += ';';

		logger.debug(`Query: ${queryString}`);

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err; // Not connected!

			// Use the connection
			connection.query(queryString, function (error, results, fields) {
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
			});
		});
	},

	// UC-203: Request personal user profile
	// Not implemented yet because there is no usage of login-tokens
	getPersonalUser: (req, res) => {
		res.status(401).json({
			status: 401,
			result: `Function not implemented yet`,
		});
	},

	// UC-204: Get single user by ID
	getUserWithId: (req, res) => {
		const userId = req.params.userId;

		logger.debug(`User met Id: ${userId} gezocht`);

		if (isNaN(userId)) {
			logger.warn('Id must be a number');

			return res.status(401).json({
				status: 401,
				result: 'Id must be a number',
			});
		}

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err; // Not connected!

			// Use the connection
			connection.query(
				`SELECT * FROM user where id = ${userId};`,
				function (error, results, fields) {
					// When done with the connection, release it.
					connection.release();

					// Handle error after the release.
					if (error) throw error;

					// Don't use the connection here, it has been returned to the pool.
					if (results.length <= 0) {
						console.debug(
							`User with id: ${userId} could not be found`
						);

						return res.status(404).json({
							status: 404,
							result: `User with id ${userId} could not be found`,
						});
					}

					const user = results[0];

					logger.debug(user);

					res.status(200).json({
						status: 200,
						result: user,
					});
				}
			);
		});
	},

	// UC-205: Update a single user
	updateUser: (req, res) => {
		const userId = req.params.userId;
		const user = req.body;
		const {
			firstName,
			lastName,
			emailAdress,
			password,
			phoneNumber,
			street,
			city,
		} = user;

		logger.debug(`UpdateUser called with Id: ${userId}`);

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err; // Not connected!

			// Use the connection
			connection.query(
				`UPDATE user SET firstName = '${firstName}', lastName = '${lastName}', emailAdress = '${emailAdress}', password = '${password}', phoneNumber = '${phoneNumber}', street = '${street}', city = '${city}' WHERE id = '${userId}';`,
				function (error, results, fields) {
					// When done with the connection, release it.
					connection.release();

					// Don't use the connection here, it has been returned to the pool.
					// Handle error after the release.
					if (error) {
						logger.debug(
							'User could not be added, emailAdress is already taken'
						);

						return res.status(401).json({
							status: 401,
							result: `User could not be added, emailAdress is already taken`,
						});
					}

					// If there are no  affected rows, then no record is found
					if (results.affectedRows == 0) {
						logger.debug(`User with id ${userId} not found`);

						return res.status(400).json({
							status: 400,
							result: `User with id ${userId} not found`,
						});
					}

					logger.debug(`User with id ${userId} sucesfully updated`);

					res.status(200).json({
						status: 200,
						result: user,
					});
				}
			);
		});
	},

	// UC-206: Delete a user
	// No usage of ownership yet
	deleteUserWithId: (req, res) => {
		const userId = req.params.userId;

		logger.debug(`DeleteUserWithId called with Id: ${userId}`);

		dbconnection.getConnection(function (err, connection) {
			if (err) throw err; // Not connected!

			// Use the connection
			connection.query(
				`DELETE FROM user WHERE id = ${userId}`,
				function (error, results, fields) {
					// When done with the connection, release it.
					connection.release();

					// Don't use the connection here, it has been returned to the pool.
					// Handle error after the release.
					if (error) throw error;

					if (results.affectedRows == 0) {
						logger.debug(`User with Id ${userId} not found`);

						return res.status(400).json({
							status: 400,
							result: `User with Id ${userId} not found`,
						});
					}

					logger.debug(`User with Id: ${userId} has been deleted`);

					res.status(200).json({
						status: 200,
						result: `User with Id ${userId} has been deleted`,
						results,
					});
				}
			);
		});
	},
};

module.exports = controller;
