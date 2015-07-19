package com.conveyal.traffic.app;

import java.awt.Rectangle;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoField;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;

import com.conveyal.traffic.app.data.WeekObject;
import com.conveyal.traffic.app.data.WeeklyStatsObject;
import com.conveyal.traffic.app.engine.Engine;
import com.conveyal.traffic.data.SpatialDataItem;
import com.conveyal.traffic.stats.SegmentStatistics;
import com.vividsolutions.jts.geom.Envelope;
import org.opentripplanner.api.model.TripPlan;
import org.opentripplanner.common.model.GenericLocation;
import org.opentripplanner.routing.core.RoutingRequest;
import org.opentripplanner.routing.core.TraverseMode;
import org.opentripplanner.routing.core.TraverseModeSet;

import com.conveyal.traffic.data.ExchangeFormat;
import com.conveyal.traffic.geom.GPSPoint;
import com.conveyal.traffic.app.data.StatsObject;
import com.conveyal.traffic.app.routing.Routing;
import com.conveyal.traffic.app.tiles.TrafficTileRequest.DataTile;
import com.conveyal.traffic.app.tiles.TrafficTileRequest.SegmentTile;
import com.fasterxml.jackson.databind.ObjectMapper;

import static spark.Spark.*;

public class TrafficEngineApp {
	
	private static final Logger log = Logger.getLogger( TrafficEngineApp.class.getName());
	
	private static final ObjectMapper mapper = new ObjectMapper();
	
	private static Routing routing = new Routing(new Rectangle(-180, -90, 360, 180));
	
	public static Properties appProps = new Properties();
		
    public static Engine engine;

	public static HashMap<String,Long> vehicleIdMap = new HashMap<>();
  	
	public static void main(String[] args) {
		
		// load settings file
		loadSettings();
		
		// setup public folder
		staticFileLocation("/public");

		engine = new Engine();

		get("/writeTrafficTiles", (request, response) -> {
			engine.collectStatistics();
			return "Traffic tiles written.";
		});

		get("/stats", (request, response) -> new StatsObject(), mapper::writeValueAsString);

		get("/weeks", (request, response) ->  {

			List<Long> weeks = engine.getTrafficEngine().getWeekList();
			List<WeekObject> weekObjects = new ArrayList();
			for(Long week : weeks) {
				WeekObject weekObj = new WeekObject();
				weekObj.weekId = week;
				weekObj.weekStartTime = SegmentStatistics.getTimeForWeek(week);
				weekObjects.add(weekObj);
			}
			return weekObjects;
		}, mapper::writeValueAsString);

		get("/weeklyStats", (request, response) -> {

			response.header("Access-Control-Allow-Origin", "*");
			response.header("Access-Control-Request-Method", "*");
			response.header("Access-Control-Allow-Headers", "*");

			double x1 = request.queryMap("x1").doubleValue();
			double x2 = request.queryMap("x2").doubleValue();
			double y1 = request.queryMap("y1").doubleValue();
			double y2 = request.queryMap("y2").doubleValue();

			List<Integer> weeks1 = new ArrayList<>();
			List<Integer> weeks2 = new ArrayList<>();

			if(request.queryMap("w1").value() != null && !request.queryMap("w1").value().trim().isEmpty()) {
				String valueStr[] = request.queryMap("w1").value().trim().split(",");
				List<String> values = new ArrayList(Arrays.asList(valueStr));
				values.forEach(v -> weeks1.add(Integer.parseInt(v.trim())));
			}

			if(request.queryMap("w2").value() != null && !request.queryMap("w2").value().trim().isEmpty()) {
				String valueStr[] = request.queryMap("w2").value().trim().split(",");
				List<String> values = new ArrayList(Arrays.asList(valueStr));
				values.forEach(v -> weeks2.add(Integer.parseInt(v.trim())));
			}

			Envelope env1 = new Envelope(x1, x2, y1, y2);

			SegmentStatistics segmentStatisticsSpeed = new SegmentStatistics();
			SegmentStatistics segmentStatisticsPercentChange = new SegmentStatistics();

			for (SpatialDataItem segment : TrafficEngineApp.engine.getTrafficEngine().getStreetSegments(env1)) {
				SegmentStatistics stats1 = TrafficEngineApp.engine.getTrafficEngine().getSegmentStatistics(segment.id, weeks1);
				if (stats1 != null) {
					segmentStatisticsSpeed.avgStats(stats1);
				}
				if(weeks2.size() > 0) {
					SegmentStatistics stats2 = TrafficEngineApp.engine.getTrafficEngine().getSegmentStatistics(segment.id, weeks2);
					if (stats2 != null) {
						segmentStatisticsPercentChange.avgPercentChangeStats(stats1, stats2);
					}
				}
			}

			if(weeks2.size() > 0)
				return new WeeklyStatsObject(segmentStatisticsPercentChange);
			else
				return new WeeklyStatsObject(segmentStatisticsSpeed);

		}, mapper::writeValueAsString);
		
		post("/locationUpdate", (request, response) -> {

			ExchangeFormat.VehicleMessageEnvelope vmEnvelope = ExchangeFormat.VehicleMessageEnvelope.parseFrom(request.bodyAsBytes());

			long sourceId = vmEnvelope.getSourceId();

			for(ExchangeFormat.VehicleMessage vm : vmEnvelope.getMessagesList()) {

				long vehicleId = getUniqueIdFromString(sourceId + "_" + vm.getVehicleId());

				for (ExchangeFormat.VehicleLocation location : vm.getLocationsList()) {

					GPSPoint gpsPoint = new GPSPoint(location.getTimestamp(), vehicleId, location.getLon(), location.getLat());

					if(gpsPoint.lat != 0.0 && gpsPoint.lon !=  0.0)
						TrafficEngineApp.engine.locationUpdate(gpsPoint);
				}
			}
			return response;
		});
		
		// routing requests 
		
		get("/route", (request, response) -> {
			
			response.header("Access-Control-Allow-Origin", "*");
			
			double fromLat = request.queryMap("fromLat").doubleValue();
			double fromLon = request.queryMap("fromLon").doubleValue(); 
			double toLat = request.queryMap("toLat").doubleValue(); 
			double toLon = request.queryMap("toLon").doubleValue(); 
			int day = request.queryMap("day").integerValue(); 
			int time = request.queryMap("time").integerValue();
			boolean useTraffic = request.queryMap("useTraffic").booleanValue(); 
			
	        routing.buildIfUnbuilt();

	        RoutingRequest rr = new RoutingRequest();

	        rr.useTraffic = useTraffic;
	        rr.from = new GenericLocation(fromLat, fromLon);
	        rr.to = new GenericLocation(toLat, toLon);
	        rr.modes = new TraverseModeSet(TraverseMode.CAR);

	        // figure out the time
	        LocalDateTime dt = LocalDateTime.now();
	        dt = dt.with(ChronoField.DAY_OF_WEEK, day).withHour(0).withMinute(0).withSecond(0);
	        dt = dt.plusSeconds(time);
	        rr.dateTime = OffsetDateTime.of(dt, ZoneOffset.UTC).toEpochSecond();

	        TripPlan tp = routing.route(rr);

	        return mapper.writeValueAsString(tp);
		});
		
		get("/tile/data", (request, response) -> {
			
			int x = request.queryMap("x").integerValue();
			int y = request.queryMap("y").integerValue();
			int z = request.queryMap("z").integerValue();
			
			response.raw().setHeader("CACHE_CONTROL", "no-cache, no-store, must-revalidate");
			response.raw().setHeader("PRAGMA", "no-cache");
			response.raw().setHeader("EXPIRES", "0");
			response.raw().setContentType("image/png");
			
			DataTile dataTile = new DataTile(x, y, z);
			
			byte[] imageData = dataTile.render();
			
			response.raw().getOutputStream().write(imageData);			
			return response;
		});
		
		get("/tile/traffic", (request, response) -> {
			
			int x = request.queryMap("x").integerValue();
			int y = request.queryMap("y").integerValue();
			int z = request.queryMap("z").integerValue();

			List<Integer> hours = new ArrayList<>();

			if(request.queryMap("h").value() != null && !request.queryMap("h").value().trim().isEmpty()) {
				String valueStr[] = request.queryMap("h").value().trim().split(",");
				List<String> values = new ArrayList(Arrays.asList(valueStr));
				values.forEach(v -> hours.add(Integer.parseInt(v.trim())));
			}

			List<Integer> w1 = new ArrayList<>();
			List<Integer> w2 = new ArrayList<>();

			if(request.queryMap("w1").value() != null && !request.queryMap("w1").value().trim().isEmpty()) {
				String valueStr[] = request.queryMap("w1").value().trim().split(",");
				List<String> values = new ArrayList(Arrays.asList(valueStr));
				values.forEach(v -> w1.add(Integer.parseInt(v.trim())));
			}

			if(request.queryMap("w2").value() != null && !request.queryMap("w2").value().trim().isEmpty()) {
				String valueStr[] = request.queryMap("w2").value().trim().split(",");
				List<String> values = new ArrayList(Arrays.asList(valueStr));
				values.forEach(v -> w2.add(Integer.parseInt(v.trim())));
			}

			response.raw().setHeader("CACHE_CONTROL", "no-cache, no-store, must-revalidate");
			response.raw().setHeader("PRAGMA", "no-cache");
			response.raw().setHeader("EXPIRES", "0");
			response.raw().setContentType("image/png");
			
			SegmentTile dataTile = new SegmentTile(x, y, z, hours, w1, w2);
			
			byte[] imageData = dataTile.render();
			
			response.raw().getOutputStream().write(imageData);			
			return response;
		});
    }

	
	static Long getUniqueIdFromString(String data) throws NoSuchAlgorithmException {

		if(vehicleIdMap.containsKey(data))
			return vehicleIdMap.get(data);

    	MessageDigest md = MessageDigest.getInstance("MD5");
		
		md.update(data.getBytes());
		ByteBuffer buffer = ByteBuffer.allocate(Long.SIZE / 8);  
		
		buffer.put(md.digest(), 0, Long.SIZE / 8);
        buffer.flip();//need flip

		vehicleIdMap.put(data, buffer.getLong());
        return vehicleIdMap.get(data);

	}
	
	public static void loadSettings() {
		try {
			FileInputStream in = new FileInputStream("application.conf");
			appProps.load(in);
			in.close();
			
		} catch (IOException e) {
			log.log(Level.WARNING, "Unable to load application.conf file: {0}", e.getMessage());
			e.printStackTrace();
		}
	}



}
